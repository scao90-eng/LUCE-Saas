'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireActive, fail, done } from '@/lib/session';
import { buildAiContext } from '@/lib/insights';
import { generateJson, assertAiCredit, recordAiUse, AiError, SYSTEM_BASE } from '@/lib/ai';
import { isDesign, type Slide } from '@/lib/carousel';

type Out = { titolo: string; slides: Slide[]; caption: string; hashtags: string };

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titolo', 'slides', 'caption', 'hashtags'],
  properties: {
    titolo: { type: 'string' },
    slides: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false, required: ['tipo', 'titolo', 'testo'],
        properties: {
          tipo: { type: 'string', enum: ['copertina', 'contenuto', 'chiusura'] },
          titolo: { type: 'string', description: 'Massimo 8 parole' },
          testo: { type: 'string', description: 'Massimo 35 parole; sulla copertina un sottotitolo breve' },
        },
      },
    },
    caption: { type: 'string', description: 'Didascalia del post con call to action' },
    hashtags: { type: 'string' },
  },
};

export async function generateCarousel(formData: FormData) {
  const { supabase, profile, subscription } = await requireActive();
  const tema = String(formData.get('tema') ?? '').trim();
  const numero = Math.min(10, Math.max(4, Number(formData.get('numero')) || 7));
  const design = String(formData.get('design') ?? '');
  const fromId = String(formData.get('da') ?? '') || null;
  if (!tema) fail('/caroselli', 'Scrivi il tema del carosello.');

  let out: Out;
  try {
    await assertAiCredit(supabase, subscription?.plan ?? 'trial');
    const context = await buildAiContext(supabase, profile);
    out = await generateJson<Out>({
      system: SYSTEM_BASE + `
In questa sezione scrivi caroselli Instagram che vengono impaginati automaticamente in slide.
Regole: la prima slide è "copertina" con un titolo-gancio fortissimo; le centrali sono "contenuto", un concetto per slide;
l'ultima è "chiusura" con invito a salvare/condividere o a prenotare. Titoli brevi (max 8 parole), testi max 35 parole,
frasi semplici e concrete, niente emoji, niente hashtag nelle slide.`,
      prompt: `Dati dell'operatore:\n\n${context}\n\nCrea un carosello di ${numero} slide.\nTema: ${tema}`,
      schema: SCHEMA,
      effort: 'medium',
    });
    await recordAiUse(supabase, 'carosello');
  } catch (e) {
    if (e instanceof AiError) fail('/caroselli', e.message);
    throw e;
  }

  const row = {
    format: 'carosello', title: out.titolo, hook: out.slides[0]?.titolo ?? null, caption: out.caption,
    hashtags: out.hashtags, slides: out.slides, design: isDesign(design) ? design : null, source: 'ai',
  };
  const res = fromId
    ? await supabase.from('content_items').update(row).eq('id', fromId).select('id').single()
    : await supabase.from('content_items').insert(row).select('id').single();
  if (res.error || !res.data) fail('/caroselli', 'Carosello generato ma non salvato. Riprova.');
  revalidatePath('/caroselli');
  revalidatePath('/contenuti');
  redirect(`/caroselli/${res.data!.id}`);
}

// Modifica a mano testi, design e didascalia; le immagini si rigenerano da sole.
export async function updateCarousel(formData: FormData) {
  const { supabase } = await requireActive();
  const id = String(formData.get('id'));
  const { data } = await supabase.from('content_items').select('slides').eq('id', id).single();
  if (!data?.slides) fail('/caroselli', 'Carosello non trovato.');
  const slides = (data!.slides as Slide[]).map((s, i) => ({
    ...s,
    titolo: String(formData.get(`titolo_${i}`) ?? s.titolo).trim(),
    testo: String(formData.get(`testo_${i}`) ?? s.testo).trim(),
  })).filter((s) => s.titolo || s.testo);
  const design = String(formData.get('design') ?? '');
  await supabase.from('content_items').update({
    slides, design: isDesign(design) ? design : null,
    caption: String(formData.get('caption') ?? '').trim() || null,
    hashtags: String(formData.get('hashtags') ?? '').trim() || null,
  }).eq('id', id);
  revalidatePath(`/caroselli/${id}`);
  done(`/caroselli/${id}`, 'Slide aggiornate.');
}
