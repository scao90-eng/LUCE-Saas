'use server';

import { revalidatePath } from 'next/cache';
import { requireActive, fail, done } from '@/lib/session';
import { buildAiContext } from '@/lib/insights';
import { generateJson, assertAiCredit, recordAiUse, AiError, SYSTEM_BASE } from '@/lib/ai';
import type { Scene } from '@/components/ContentCard';

type Reel = {
  titolo: string; hook: string; durata_secondi: number; scene: Scene[];
  audio: string; consigli_ripresa: string; caption: string; hashtags: string; cta: string;
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['titolo', 'hook', 'durata_secondi', 'scene', 'audio', 'consigli_ripresa', 'caption', 'hashtags', 'cta'],
  properties: {
    titolo: { type: 'string' },
    hook: { type: 'string', description: 'Frase dei primi 2 secondi' },
    durata_secondi: { type: 'integer' },
    scene: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['secondi', 'visivo', 'testo_schermo', 'voce'],
        properties: {
          secondi: { type: 'string', description: 'Intervallo, es. 0-3s' },
          visivo: { type: 'string', description: 'Cosa si vede / come riprendere' },
          testo_schermo: { type: 'string', description: 'Testo in sovrimpressione (breve)' },
          voce: { type: 'string', description: 'Parlato o voce fuori campo' },
        },
      },
    },
    audio: { type: 'string', description: 'Tipo di musica o audio di tendenza adatto' },
    consigli_ripresa: { type: 'string', description: 'Luce, inquadratura, ambiente: consigli pratici con lo smartphone' },
    caption: { type: 'string' },
    hashtags: { type: 'string' },
    cta: { type: 'string' },
  },
};

export async function generateReel(formData: FormData) {
  const { supabase, profile, subscription } = await requireActive();
  const tema = String(formData.get('tema') ?? '').trim();
  const durata = Number(formData.get('durata')) || 30;
  const stile = String(formData.get('stile') ?? 'parlato in camera');
  if (!tema) fail('/reel', 'Scrivi il tema del reel.');

  let reel: Reel;
  try {
    await assertAiCredit(supabase, subscription?.plan ?? 'trial');
    const context = await buildAiContext(supabase, profile);
    reel = await generateJson<Reel>({
      system: SYSTEM_BASE + '\nIn questa sezione scrivi script di reel girabili da sole/i con uno smartphone, senza attrezzatura professionale.',
      prompt: `Dati dell'operatore:\n\n${context}\n\nScrivi lo script di un reel di circa ${durata} secondi.\nTema: ${tema}\nStile: ${stile}\nScene brevi (2-6 secondi), hook fortissimo nei primi 2 secondi, testo a schermo leggibile, chiusura con call to action coerente con l'attività.`,
      schema: SCHEMA,
      effort: 'medium',
    });
    await recordAiUse(supabase, 'reel');
  } catch (e) {
    if (e instanceof AiError) fail('/reel', e.message);
    throw e;
  }

  const { error } = await supabase.from('content_items').insert({
    format: 'reel', title: reel.titolo, pillar: null, hook: reel.hook,
    caption: `${reel.caption}\n\n${reel.cta}`.trim(), hashtags: reel.hashtags,
    script: { durata_secondi: reel.durata_secondi, scene: reel.scene, audio: reel.audio, consigli_ripresa: reel.consigli_ripresa, cta: reel.cta },
    planned_for: String(formData.get('planned_for') || '') || null, status: 'idea', source: 'ai',
  });
  if (error) fail('/reel', 'Script generato ma non salvato. Riprova.');
  revalidatePath('/reel');
  revalidatePath('/contenuti');
  done('/reel', 'Script del reel pronto.');
}
