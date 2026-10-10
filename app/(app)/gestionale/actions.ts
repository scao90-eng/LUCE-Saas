'use server';

import { revalidatePath } from 'next/cache';
import { requireActive, fail, done } from '@/lib/session';

export async function addTransaction(formData: FormData) {
  const { supabase } = await requireActive();
  const kind = String(formData.get('kind'));
  const amount = Number(String(formData.get('amount') ?? '').replace(',', '.'));
  const category = String(formData.get('category') ?? '').trim();
  if (!['entrata', 'spesa'].includes(kind) || !(amount > 0) || !category) {
    fail('/gestionale', 'Indica tipo, importo maggiore di zero e categoria.');
  }
  const { error } = await supabase.from('transactions').insert({
    kind, amount, category,
    description: String(formData.get('description') ?? '').trim() || null,
    occurred_on: String(formData.get('occurred_on') || '') || undefined,
    method: String(formData.get('method') ?? '') || null,
    client_id: String(formData.get('client_id') ?? '') || null,
  });
  if (error) fail('/gestionale', 'Salvataggio non riuscito.');
  revalidatePath('/gestionale');
  revalidatePath('/dashboard');
  done('/gestionale', kind === 'entrata' ? 'Entrata registrata.' : 'Spesa registrata.');
}

export async function deleteTransaction(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from('transactions').delete().eq('id', String(formData.get('id')));
  revalidatePath('/gestionale');
  revalidatePath('/dashboard');
}
