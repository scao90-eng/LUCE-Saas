'use server';

import { revalidatePath } from 'next/cache';
import { requireActive, fail, done } from '@/lib/session';

const int = (f: FormData, k: string) => {
  const v = String(f.get(k) ?? '').replace(/\D/g, '');
  return v === '' ? null : Number(v);
};

export async function addSnapshot(formData: FormData) {
  const { supabase } = await requireActive();
  const followers = int(formData, 'followers');
  if (followers === null) fail('/social', 'Indica il numero di follower.');
  const { error } = await supabase.from('social_snapshots').upsert({
    platform: String(formData.get('platform') || 'instagram'),
    taken_on: String(formData.get('taken_on') || '') || new Date().toLocaleDateString('sv-SE'),
    followers, reach: int(formData, 'reach'), profile_visits: int(formData, 'profile_visits'), link_clicks: int(formData, 'link_clicks'),
  }, { onConflict: 'owner_id,platform,taken_on' });
  if (error) fail('/social', 'Salvataggio non riuscito.');
  revalidatePath('/social');
  revalidatePath('/dashboard');
  done('/social', 'Rilevazione salvata.');
}

export async function addPost(formData: FormData) {
  const { supabase } = await requireActive();
  const published_on = String(formData.get('published_on') ?? '');
  const format = String(formData.get('format') ?? '');
  if (!published_on || !format) fail('/social', 'Indica data e formato del contenuto.');
  const { error } = await supabase.from('social_posts').insert({
    platform: String(formData.get('platform') || 'instagram'), published_on, format,
    topic: String(formData.get('topic') ?? '').trim() || null, url: String(formData.get('url') ?? '').trim() || null,
    reach: int(formData, 'reach') ?? 0, likes: int(formData, 'likes') ?? 0, comments: int(formData, 'comments') ?? 0,
    saves: int(formData, 'saves') ?? 0, shares: int(formData, 'shares') ?? 0,
  });
  if (error) fail('/social', 'Salvataggio non riuscito.');
  revalidatePath('/social');
  done('/social', 'Contenuto aggiunto all\'analisi.');
}

export async function deletePost(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from('social_posts').delete().eq('id', String(formData.get('id')));
  revalidatePath('/social');
}
