'use server';

import { revalidatePath } from 'next/cache';
import { requireSession, fail, done } from '@/lib/session';

export async function saveProfile(formData: FormData) {
  const { supabase, user } = await requireSession();
  const v = (k: string) => String(formData.get(k) ?? '').trim() || null;
  const { error } = await supabase.from('profiles').upsert({
    id: user.id, full_name: v('full_name'), business_name: v('business_name'), discipline: v('discipline'),
    city: v('city'), target: v('target'), tone: v('tone'), instagram_handle: v('instagram_handle')?.replace(/^@/, '') ?? null,
  });
  if (error) fail('/impostazioni', 'Salvataggio non riuscito.');
  revalidatePath('/', 'layout');
  done('/impostazioni', 'Profilo salvato.');
}
