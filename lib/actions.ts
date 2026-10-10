'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { supabaseConfigured } from '@/lib/supabase/env';

const safeNext = (n: string) => (n.startsWith('/') && !n.startsWith('//') ? n : '/dashboard');

export async function signIn(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '/dashboard') || '/dashboard';

  if (!supabaseConfigured()) redirect('/login?error=config');
  if (!email || !password) redirect(`/login?error=missing&next=${encodeURIComponent(next)}`);

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=credentials&next=${encodeURIComponent(next)}`);

  revalidatePath('/', 'layout');
  redirect(safeNext(next));
}

export async function signUp(formData: FormData) {
  const full_name = String(formData.get('full_name') ?? '').trim();
  const business_name = String(formData.get('business_name') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');

  if (!supabaseConfigured()) redirect('/registrati?error=config');
  if (!email || password.length < 8) redirect('/registrati?error=password');

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name, business_name } },
  });
  if (error) redirect('/registrati?error=signup');

  // Con conferma email attiva non c'è ancora una sessione.
  if (!data.session) redirect('/login?ok=confirm');
  revalidatePath('/', 'layout');
  redirect('/impostazioni?benvenuto=1');
}

export async function signOut() {
  if (supabaseConfigured()) await createClient().auth.signOut();
  revalidatePath('/', 'layout');
  redirect('/login');
}
