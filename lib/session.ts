import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';
import type { PlanId } from '@/lib/plans';

export type Profile = {
  id: string; full_name: string | null; business_name: string | null; discipline: string | null;
  city: string | null; target: string | null; tone: string | null; instagram_handle: string | null;
  brand_color?: string | null; carousel_design?: string | null;
  sidebar_color?: string | null; logo_url?: string | null;
};
export type Subscription = {
  plan: PlanId; status: string; trial_ends_at: string; current_period_end: string | null;
  stripe_customer_id: string | null;
};

// Utente + profilo + abbonamento della richiesta corrente (una volta per render).
export const getSession = cache(async () => {
  if (!supabaseConfigured()) return null;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [{ data: profile }, { data: sub }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
  ]);
  return {
    supabase,
    user,
    profile: (profile ?? { id: user.id }) as Profile,
    subscription: (sub ?? null) as Subscription | null,
  };
});

export async function requireSession() {
  const s = await getSession();
  if (!s) redirect('/login');
  return s;
}

// L'abbonamento consente l'uso? (prova non scaduta o abbonamento attivo)
export function subscriptionActive(sub: Subscription | null) {
  if (!sub) return false;
  if (sub.status === 'active') return true;
  if (sub.status === 'trialing') return new Date(sub.trial_ends_at) > new Date();
  return false;
}

// Per le server action che scrivono: serve un abbonamento attivo o una prova valida.
export async function requireActive() {
  const s = await requireSession();
  if (!subscriptionActive(s.subscription)) {
    redirect('/abbonamento?error=' + encodeURIComponent('La prova è terminata: scegli un piano per continuare a usare Luce.'));
  }
  return s;
}

export const fail = (path: string, msg: string): never => redirect(`${path}${path.includes('?') ? '&' : '?'}error=${encodeURIComponent(msg)}`);
export const done = (path: string, msg: string): never => redirect(`${path}${path.includes('?') ? '&' : '?'}ok=${encodeURIComponent(msg)}`);
