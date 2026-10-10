'use server';

import { revalidatePath } from 'next/cache';
import { requireActive, fail, done } from '@/lib/session';
import { buildAiContext } from '@/lib/insights';
import { generateJson, assertAiCredit, recordAiUse, AiError, SYSTEM_BASE } from '@/lib/ai';
import { weekStart } from '@/lib/format';

type Idea = { formato: 'reel' | 'carosello' | 'post' | 'storia'; giorno: number; titolo: string; pilastro: string; hook: string; caption: string; hashtags: string };

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['contenuti'],
  properties: {
    contenuti: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['formato', 'giorno', 'titolo', 'pilastro', 'hook', 'caption', 'hashtags'],
        properties: {
          formato: { type: 'string', enum: ['reel', 'carosello', 'post', 'storia'] },
          giorno: { type: 'integer', description: 'Giorno di pubblicazione: 0 = lunedì ... 6 = domenica' },
          titolo: { type: 'string' },
          pilastro: { type: 'string', enum: ['educazione', 'ispirazione', 'dietro le quinte', 'testimonianza', 'offerta', 'community'] },
          hook: { type: 'string', description: 'Prima frase / primi 2 secondi che fermano lo scroll' },
          caption: { type: 'string', description: 'Didascalia completa pronta da pubblicare, con call to action finale' },
          hashtags: { type: 'string', description: '8-12 hashtag pertinenti, anche locali' },
        },
      },
    },
  },
};

export async function generateEditorialPlan(formData: FormData) {
  const { supabase, profile, subscription } = await requireActive();
  const count = Math.min(10, Math.max(3, Number(formData.get('count')) || 5));
  const start = String(formData.get('week') || '') || weekStart();
  const goal = String(formData.get('goal') ?? '').trim();

  let ideas: Idea[];
  try {
    await assertAiCredit(supabase, subscription?.plan ?? 'trial');
    const context = await buildAiContext(supabase, profile);
    const out = await generateJson<{ contenuti: Idea[] }>({
      system: SYSTEM_BASE + '\nIn questa sezione crei il piano editoriale: scegli formati e temi in base a ciò che i dati dicono funzionare meglio.',
      prompt: `Dati dell'operatore:\n\n${context}\n\nCrea un piano editoriale di ${count} contenuti per la settimana che inizia ${start}.${goal ? ` Obiettivo della settimana: ${goal}.` : ''}\nPrivilegia i formati e i temi con engagement più alto, distribuisci i pilastri (non solo offerta), pubblica nei giorni più forti se noti.`,
      schema: SCHEMA,
      effort: 'medium',
    });
    ideas = out.contenuti;
    await recordAiUse(supabase, 'contenuti');
  } catch (e) {
    if (e instanceof AiError) fail('/contenuti', e.message);
    throw e;
  }

  const base = new Date(start + 'T12:00:00');
  const rows = ideas.map((i) => {
    const d = new Date(base);
    d.setDate(d.getDate() + Math.min(6, Math.max(0, i.giorno)));
    return {
      format: i.formato, title: i.titolo, pillar: i.pilastro, hook: i.hook, caption: i.caption,
      hashtags: i.hashtags, planned_for: d.toLocaleDateString('sv-SE'), source: 'ai',
    };
  });
  const { error } = await supabase.from('content_items').insert(rows);
  if (error) fail('/contenuti', 'Piano generato ma non salvato. Riprova.');
  revalidatePath('/contenuti');
  revalidatePath('/dashboard');
  done('/contenuti', `${rows.length} contenuti aggiunti al piano.`);
}

export async function setContentStatus(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from('content_items').update({ status: String(formData.get('status')) }).eq('id', String(formData.get('id')));
  revalidatePath('/contenuti');
  revalidatePath('/reel');
  revalidatePath('/dashboard');
}

export async function deleteContent(formData: FormData) {
  const { supabase } = await requireActive();
  await supabase.from('content_items').delete().eq('id', String(formData.get('id')));
  revalidatePath('/contenuti');
  revalidatePath('/reel');
}
