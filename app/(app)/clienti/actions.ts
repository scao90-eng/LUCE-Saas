'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActive, fail, done } from '@/lib/session';

const clean = (f: FormData, k: string) => String(f.get(k) ?? '').trim() || null;

export async function addClient(formData: FormData) {
  const { supabase } = await requireActive();
  const full_name = clean(formData, 'full_name');
  if (!full_name) fail('/clienti', 'Il nome è obbligatorio.');
  const { data, error } = await supabase.from('clients').insert({
    full_name, email: clean(formData, 'email'), phone: clean(formData, 'phone'),
    source: clean(formData, 'source'), status: clean(formData, 'status') ?? 'attivo', notes: clean(formData, 'notes'),
  }).select('id').single();
  if (error || !data) fail('/clienti', 'Salvataggio non riuscito.');
  revalidatePath('/clienti');
  redirect(`/clienti/${data!.id}`);
}

export async function updateClient(formData: FormData) {
  const { supabase } = await requireActive();
  const id = String(formData.get('id'));
  const { error } = await supabase.from('clients').update({
    full_name: clean(formData, 'full_name') ?? 'Senza nome', email: clean(formData, 'email'), phone: clean(formData, 'phone'),
    birth_date: clean(formData, 'birth_date'), source: clean(formData, 'source'),
    status: clean(formData, 'status') ?? 'attivo', notes: clean(formData, 'notes'),
  }).eq('id', id);
  if (error) fail(`/clienti/${id}`, 'Aggiornamento non riuscito.');
  revalidatePath(`/clienti/${id}`);
  done(`/clienti/${id}`, 'Scheda aggiornata.');
}

export async function deleteClient(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from('clients').delete().eq('id', String(formData.get('id')));
  revalidatePath('/clienti');
  redirect('/clienti?ok=' + encodeURIComponent('Cliente eliminato.'));
}

export async function addAppointment(formData: FormData) {
  const { supabase } = await requireActive();
  const client_id = String(formData.get('client_id'));
  const date = String(formData.get('date') ?? ''), time = String(formData.get('time') ?? '09:00');
  const service = clean(formData, 'service');
  if (!date || !service) fail(`/clienti/${client_id}`, 'Indica data e servizio.');
  const { error } = await supabase.from('appointments').insert({
    client_id, service, starts_at: new Date(`${date}T${time}`).toISOString(),
    price: Number(String(formData.get('price') ?? '0').replace(',', '.')) || 0, notes: clean(formData, 'notes'),
  });
  if (error) fail(`/clienti/${client_id}`, 'Salvataggio non riuscito.');
  revalidatePath(`/clienti/${client_id}`);
  done(`/clienti/${client_id}`, 'Seduta aggiunta.');
}

// Segna la seduta come svolta e, se ha un prezzo, registra l'entrata nel gestionale.
export async function completeAppointment(formData: FormData) {
  const { supabase } = await requireActive();
  const id = String(formData.get('id'));
  const { data: a } = await supabase.from('appointments').select('*').eq('id', id).single();
  if (!a) fail('/clienti', 'Seduta non trovata.');
  await supabase.from('appointments').update({ status: 'svolto' }).eq('id', id);
  if (Number(a!.price) > 0 && formData.get('register') === '1') {
    await supabase.from('transactions').insert({
      kind: 'entrata', amount: a!.price, category: 'Sedute individuali', description: a!.service,
      occurred_on: new Date(a!.starts_at).toLocaleDateString('sv-SE'), client_id: a!.client_id,
    });
  }
  revalidatePath(`/clienti/${a!.client_id}`);
  revalidatePath('/gestionale');
  done(`/clienti/${a!.client_id}`, 'Seduta segnata come svolta.');
}

export async function cancelAppointment(formData: FormData) {
  const { supabase } = await requireActive();
  const id = String(formData.get('id'));
  const { data: a } = await supabase.from('appointments').update({ status: 'annullato' }).eq('id', id).select('client_id').single();
  revalidatePath(`/clienti/${a?.client_id}`);
}
