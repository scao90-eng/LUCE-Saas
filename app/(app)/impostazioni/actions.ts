'use server';

import { revalidatePath } from 'next/cache';
import { requireSession, fail, done } from '@/lib/session';
import { isHex, DEFAULT_BRAND, DEFAULT_SIDEBAR } from '@/lib/theme';
import { isDesign } from '@/lib/carousel';

const v = (f: FormData, k: string) => String(f.get(k) ?? '').trim() || null;

export async function saveProfile(formData: FormData) {
  const { supabase, user } = await requireSession();
  const handle = v(formData, 'instagram_handle')?.replace(/^@/, '').replace(/^.*instagram\.com\//i, '').replace(/[/?].*$/, '') || null;
  const { error } = await supabase.from('profiles').update({
    full_name: v(formData, 'full_name'), business_name: v(formData, 'business_name'), discipline: v(formData, 'discipline'),
    city: v(formData, 'city'), target: v(formData, 'target'), tone: v(formData, 'tone'), instagram_handle: handle,
  }).eq('id', user.id);
  if (error) fail('/impostazioni', 'Salvataggio non riuscito.');
  revalidatePath('/', 'layout');
  done('/impostazioni', 'Profilo salvato.');
}

// Colori dell'app e stile predefinito dei caroselli.
export async function saveAppearance(formData: FormData) {
  const { supabase, user } = await requireSession();
  const brand = v(formData, 'brand_color'), sidebar = v(formData, 'sidebar_color'), design = v(formData, 'carousel_design');
  const { error } = await supabase.from('profiles').update({
    brand_color: isHex(brand) ? brand : DEFAULT_BRAND,
    sidebar_color: isHex(sidebar) ? sidebar : DEFAULT_SIDEBAR,
    carousel_design: isDesign(design) ? design : 'crema',
  }).eq('id', user.id);
  if (error) fail('/impostazioni#aspetto', 'Salvataggio non riuscito.');
  revalidatePath('/', 'layout');
  done('/impostazioni', 'Colori aggiornati.');
}

const LOGO_TYPES: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
const MAX_LOGO = 2 * 1024 * 1024;

export async function uploadLogo(formData: FormData) {
  const { supabase, user } = await requireSession();
  const file = formData.get('logo');
  if (!(file instanceof File) || !file.size) fail('/impostazioni', 'Scegli un file immagine.');
  const f = file as File;
  const ext = LOGO_TYPES[f.type];
  if (!ext) fail('/impostazioni', 'Formato non supportato: usa PNG, JPG o WebP.');
  if (f.size > MAX_LOGO) fail('/impostazioni', 'Il logo supera i 2 MB.');

  // Nome sempre nuovo: evita che browser e CDN mostrino il logo precedente.
  const path = `${user.id}/logo-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('logos').upload(path, f, { contentType: f.type, upsert: false });
  if (error) fail('/impostazioni', 'Caricamento non riuscito. Verifica che lo script 003 sia stato eseguito su Supabase.');

  const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path);
  const { data: old } = await supabase.storage.from('logos').list(user.id);
  const stale = (old ?? []).map((o: { name: string }) => `${user.id}/${o.name}`).filter((p: string) => p !== path);
  if (stale.length) await supabase.storage.from('logos').remove(stale);

  await supabase.from('profiles').update({ logo_url: publicUrl }).eq('id', user.id);
  revalidatePath('/', 'layout');
  done('/impostazioni', 'Logo caricato.');
}

export async function removeLogo() {
  const { supabase, user } = await requireSession();
  const { data: files } = await supabase.storage.from('logos').list(user.id);
  if (files?.length) await supabase.storage.from('logos').remove(files.map((o: { name: string }) => `${user.id}/${o.name}`));
  await supabase.from('profiles').update({ logo_url: null }).eq('id', user.id);
  revalidatePath('/', 'layout');
  done('/impostazioni', 'Logo rimosso.');
}
