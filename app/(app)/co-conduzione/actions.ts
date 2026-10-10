'use server';

import { revalidatePath } from 'next/cache';
import { requireActive, fail, done } from '@/lib/session';
import { buildAiContext } from '@/lib/insights';
import { generateJson, assertAiCredit, recordAiUse, AiError, SYSTEM_BASE } from '@/lib/ai';
import { weekStart } from '@/lib/format';

type Plan = {
  sintesi: string;
  punti_forza: string[];
  criticita: string[];
  azioni: { titolo: string; perche: string; come: string; metrica: string }[];
};

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['sintesi', 'punti_forza', 'criticita', 'azioni'],
  properties: {
    sintesi: { type: 'string', description: 'Lettura dei numeri in 3-4 frasi, con i dati citati' },
    punti_forza: { type: 'array', items: { type: 'string' } },
    criticita: { type: 'array', items: { type: 'string' } },
    azioni: {
      type: 'array',
      description: 'Da 3 a 5 azioni concrete per i prossimi 7 giorni, in ordine di impatto',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['titolo', 'perche', 'come', 'metrica'],
        properties: {
          titolo: { type: 'string', description: 'Azione in poche parole, all\'imperativo' },
          perche: { type: 'string', description: 'Il dato che la motiva' },
          come: { type: 'string', description: 'Passi pratici' },
          metrica: { type: 'string', description: 'Numero da guardare la settimana prossima per capire se ha funzionato' },
        },
      },
    },
  },
};

export async function generateCoachingPlan(formData: FormData) {
  const { supabase, profile, subscription } = await requireActive();
  const focus = String(formData.get('focus') ?? '').trim();
  let plan: Plan;
  try {
    await assertAiCredit(supabase, subscription?.plan ?? 'trial');
    const context = await buildAiContext(supabase, profile);
    plan = await generateJson<Plan>({
      system: SYSTEM_BASE + '\nIn questa sezione fai da co-conduttrice del profilo e dell\'attività: leggi i numeri e decidi le priorità della settimana.',
      prompt: `Ecco i dati aggiornati dell'operatore:\n\n${context}\n\n${focus ? `Obiettivo che l'operatore vuole raggiungere ora: ${focus}\n\n` : ''}Prepara il piano di co-conduzione per la settimana: cosa sta funzionando, cosa no, e le azioni da fare (contenuti, profilo, relazione con i clienti, prezzi o offerta se i numeri lo suggeriscono).`,
      schema: SCHEMA,
      effort: 'medium',
    });
    await recordAiUse(supabase, 'coaching');
  } catch (e) {
    if (e instanceof AiError) fail('/co-conduzione', e.message);
    throw e;
  }

  const summary = [plan.sintesi,
    plan.punti_forza.length ? `\n\nCosa funziona:\n• ${plan.punti_forza.join('\n• ')}` : '',
    plan.criticita.length ? `\n\nDa migliorare:\n• ${plan.criticita.join('\n• ')}` : ''].join('');
  const { error } = await supabase.from('coaching_plans').insert({
    week_start: weekStart(), summary, actions: plan.azioni.map((a) => ({ ...a, fatto: false })),
  });
  if (error) fail('/co-conduzione', 'Piano generato ma non salvato. Riprova.');
  revalidatePath('/co-conduzione');
  revalidatePath('/dashboard');
  done('/co-conduzione', 'Piano della settimana pronto.');
}

export async function toggleAction(formData: FormData) {
  const { supabase } = await requireActive();
  const id = String(formData.get('id'));
  const index = Number(formData.get('index'));
  const { data } = await supabase.from('coaching_plans').select('actions').eq('id', id).single();
  if (!data) return;
  const actions = data.actions as { fatto?: boolean }[];
  if (actions[index]) actions[index].fatto = !actions[index].fatto;
  await supabase.from('coaching_plans').update({ actions }).eq('id', id);
  revalidatePath('/co-conduzione');
  revalidatePath('/dashboard');
}
