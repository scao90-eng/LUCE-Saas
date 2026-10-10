import Anthropic from '@anthropic-ai/sdk';
import type { SupabaseClient } from '@supabase/supabase-js';
import { AI_MONTHLY_LIMIT, type PlanId } from '@/lib/plans';
import { monthStart } from '@/lib/format';

// Modello usato per co-conduzione, piano editoriale e script reel.
export const AI_MODEL = 'claude-opus-5-5';

export class AiError extends Error {}

export const SYSTEM_BASE = `Sei "Luce", co-conduttrice digitale per professionisti del benessere olistico
(yoga, reiki, naturopatia, meditazione, danza, massaggio, coaching). Scrivi sempre in italiano.
Ti basi sui numeri reali che ricevi: cita i dati quando motivi un consiglio e non inventare metriche.
Se i dati sono pochi, dillo e proponi come raccoglierne di più.
Rispetta il tono di voce dell'operatore. Niente promesse di guarigione o affermazioni sanitarie:
parla di benessere, consapevolezza ed esperienza, mai di cure o diagnosi.`;

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

type AiKind = 'coaching' | 'contenuti' | 'reel' | 'analisi' | 'carosello';

// Verifica il limite mensile del piano prima di chiamare l'AI.
export async function assertAiCredit(supabase: SupabaseClient, plan: PlanId) {
  const limit = AI_MONTHLY_LIMIT[plan];
  if (limit === null) return;
  const { count } = await supabase
    .from('ai_generations')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', monthStart());
  if ((count ?? 0) >= limit) {
    throw new AiError(`Hai usato le ${limit} generazioni AI incluse questo mese. Passa al piano Pro per averne di illimitate.`);
  }
}

// Registra una generazione riuscita (conta per il limite mensile).
export async function recordAiUse(supabase: SupabaseClient, kind: AiKind) {
  await supabase.from('ai_generations').insert({ kind });
}

// Chiamata a Claude con output JSON vincolato allo schema.
export async function generateJson<T>(opts: {
  system: string;
  // Testo, oppure blocchi (es. immagini + testo) per le richieste con screenshot.
  prompt: string | Anthropic.Beta.BetaContentBlockParam[];
  schema: Record<string, unknown>;
  effort?: 'low' | 'medium' | 'high';
}): Promise<T> {
  if (!aiConfigured()) throw new AiError('AI non configurata: aggiungi ANTHROPIC_API_KEY alle variabili d\'ambiente.');

  const client = new Anthropic();
  let response: Anthropic.Beta.BetaMessage;
  try {
    response = await client.beta.messages.create({
      model: AI_MODEL,
      max_tokens: 16000,
      // Se il modello declina la richiesta, l'API la ripete su un modello di riserva.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: opts.effort ?? 'medium',
        format: { type: 'json_schema', schema: opts.schema },
      },
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
    });
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) throw new AiError('Troppe richieste in questo momento: riprova tra un minuto.');
    if (error instanceof Anthropic.AuthenticationError) throw new AiError('Chiave ANTHROPIC_API_KEY non valida.');
    if (error instanceof Anthropic.APIError) throw new AiError(`Servizio AI non disponibile (${error.status}). Riprova.`);
    throw error;
  }

  if (response.stop_reason === 'refusal') throw new AiError('La richiesta non può essere elaborata: riformula il tema.');
  if (response.stop_reason === 'max_tokens') throw new AiError('Risposta troppo lunga: chiedi meno contenuti alla volta.');

  const text = response.content.flatMap((b) => (b.type === 'text' ? [b.text] : [])).join('');
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new AiError('Risposta AI non leggibile: riprova.');
  }
}
