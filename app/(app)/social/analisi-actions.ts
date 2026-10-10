'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type Anthropic from '@anthropic-ai/sdk';
import { requireActive, fail, done } from '@/lib/session';
import { generateJson, assertAiCredit, recordAiUse, AiError, SYSTEM_BASE } from '@/lib/ai';
import { parseUsername, fetchPublicProfile, publicStats, igFormat, IgError, type PublicStats } from '@/lib/instagram';
import { today } from '@/lib/format';
import { methodGuidance } from '@/lib/methods';

export type Audit = {
  voto: number;
  sintesi: string;
  bio: { valutazione: string; proposta: string };
  punti_forza: string[];
  criticita: string[];
  pilastri_consigliati: { nome: string; descrizione: string }[];
  frequenza_consigliata: string;
  idee_caroselli: { titolo: string; perche: string }[];
  idee_reel: { titolo: string; perche: string }[];
};

const idea = {
  type: 'object', additionalProperties: false, required: ['titolo', 'perche'],
  properties: { titolo: { type: 'string' }, perche: { type: 'string' } },
};
const AUDIT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['voto', 'sintesi', 'bio', 'punti_forza', 'criticita', 'pilastri_consigliati', 'frequenza_consigliata', 'idee_caroselli', 'idee_reel'],
  properties: {
    voto: { type: 'integer', description: 'Valutazione complessiva del profilo da 1 a 10' },
    sintesi: { type: 'string', description: '3-5 frasi, con i numeri citati' },
    bio: {
      type: 'object', additionalProperties: false, required: ['valutazione', 'proposta'],
      properties: { valutazione: { type: 'string' }, proposta: { type: 'string', description: 'Bio riscritta, max 150 caratteri, con call to action' } },
    },
    punti_forza: { type: 'array', items: { type: 'string' } },
    criticita: { type: 'array', items: { type: 'string' } },
    pilastri_consigliati: {
      type: 'array', description: '3-5 pilastri editoriali',
      items: { type: 'object', additionalProperties: false, required: ['nome', 'descrizione'], properties: { nome: { type: 'string' }, descrizione: { type: 'string' } } },
    },
    frequenza_consigliata: { type: 'string' },
    idee_caroselli: { type: 'array', description: '4 idee di carosello', items: idea },
    idee_reel: { type: 'array', description: '3 idee di reel', items: idea },
  },
};

const AUDIT_SYSTEM = SYSTEM_BASE + `
In questa sezione fai l'analisi di un profilo Instagram: posizionamento, bio, coerenza dei contenuti,
formati, frequenza, interazioni. Sii concreta e onesta, con esempi presi dai contenuti reali.`;

// ---------- Analisi da link (dati pubblici via Meta Business Discovery) ----------
export async function analyzeFromLink(formData: FormData) {
  const { supabase, profile, subscription } = await requireActive();
  const username = parseUsername(String(formData.get('link') ?? ''));
  if (!username) fail('/social', 'Link non valido: incolla l\'indirizzo del profilo, es. instagram.com/nomeprofilo');
  const isOwn = (profile.instagram_handle ?? '').replace(/^@/, '').toLowerCase() === username;

  let stats: PublicStats, audit: Audit, captions: { id: string; caption: string }[] = [];
  let raw: Awaited<ReturnType<typeof fetchPublicProfile>>;
  try {
    await assertAiCredit(supabase, subscription?.plan ?? 'trial');
    raw = await fetchPublicProfile(username!);
    stats = publicStats(raw);
    captions = raw.media.map((m) => ({ id: m.id, caption: (m.caption ?? '').slice(0, 300) }));
    audit = await generateJson<Audit>({
      system: AUDIT_SYSTEM,
      prompt: `${isOwn ? 'Profilo dell\'operatore' : `Profilo di riferimento (non è dell'operatore: individua cosa imparare)`}.\n` +
        `Attività dell'operatore: ${profile.discipline || 'n.d.'}, ${profile.city || ''}, pubblico: ${profile.target || 'n.d.'}.\n\n` +
        (methodGuidance(profile.discipline) ? `${methodGuidance(profile.discipline)}\n\n` : '') +
        `Numeri pubblici:\n${JSON.stringify({ ...stats, top: undefined }, null, 1)}\n\n` +
        `Contenuti migliori: ${JSON.stringify(stats.top)}\n\n` +
        `Didascalie recenti:\n${captions.map((c, i) => `${i + 1}. ${c.caption.replace(/\s+/g, ' ')}`).join('\n')}`,
      schema: AUDIT_SCHEMA,
      effort: 'medium',
    });
    await recordAiUse(supabase, 'analisi');
  } catch (e) {
    if (e instanceof AiError || e instanceof IgError) fail('/social', e.message);
    throw e;
  }

  // Sul proprio profilo i numeri entrano anche nello storico (follower + ultimi post).
  if (isOwn) {
    await supabase.from('social_snapshots').upsert(
      { platform: 'instagram', taken_on: today(), followers: stats.followers },
      { onConflict: 'owner_id,platform,taken_on' },
    );
    await supabase.from('social_posts').upsert(
      raw!.media.map((m) => ({
        platform: 'instagram', external_id: m.id, published_on: m.timestamp.slice(0, 10), format: igFormat(m),
        topic: (m.caption ?? '').split('\n')[0].slice(0, 80) || null, url: m.permalink ?? null,
        likes: m.like_count ?? 0, comments: m.comments_count ?? 0, followers_base: stats.followers,
      })),
      { onConflict: 'owner_id,external_id' },
    );
  }

  const { data, error } = await supabase.from('profile_audits')
    .insert({ username, is_own: isOwn, source: 'link', stats, audit }).select('id').single();
  if (error || !data) fail('/social', 'Analisi completata ma non salvata. Riprova.');
  revalidatePath('/social');
  redirect(`/social/analisi/${data!.id}`);
}

// ---------- Analisi da screenshot (Insight di Instagram letti dall'AI) ----------
type Extract = {
  periodo: string;
  follower: number; account_raggiunti: number; visite_profilo: number; clic_link: number;
  contenuti: { data: string; formato: 'reel' | 'carosello' | 'post' | 'storia'; tema: string; copertura: number; mi_piace: number; commenti: number; salvataggi: number; condivisioni: number }[];
  bio_letta: string;
};
const n = { type: 'integer', description: '-1 se il dato non è visibile' };
const EXTRACT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['periodo', 'follower', 'account_raggiunti', 'visite_profilo', 'clic_link', 'contenuti', 'bio_letta'],
  properties: {
    periodo: { type: 'string', description: 'Periodo degli insight se indicato (es. "ultimi 30 giorni"), altrimenti stringa vuota' },
    follower: n, account_raggiunti: n, visite_profilo: n, clic_link: n,
    contenuti: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['data', 'formato', 'tema', 'copertura', 'mi_piace', 'commenti', 'salvataggi', 'condivisioni'],
        properties: {
          data: { type: 'string', description: 'YYYY-MM-DD se leggibile, altrimenti stringa vuota' },
          formato: { type: 'string', enum: ['reel', 'carosello', 'post', 'storia'] },
          tema: { type: 'string', description: 'Tema o prime parole della didascalia' },
          copertura: n, mi_piace: n, commenti: n, salvataggi: n, condivisioni: n,
        },
      },
    },
    bio_letta: { type: 'string', description: 'Testo della bio se presente in una schermata, altrimenti stringa vuota' },
  },
};

const MAX_FILES = 6;

export async function analyzeFromScreenshots(formData: FormData) {
  const { supabase, profile, subscription } = await requireActive();
  const files = formData.getAll('shots').filter((f): f is File => f instanceof File && f.size > 0).slice(0, MAX_FILES);
  if (!files.length) fail('/social', 'Carica almeno uno screenshot.');

  const images: Anthropic.Beta.BetaContentBlockParam[] = [];
  for (const f of files) {
    const type = f.type === 'image/png' ? 'image/png' : f.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    images.push({ type: 'image', source: { type: 'base64', media_type: type, data: Buffer.from(await f.arrayBuffer()).toString('base64') } });
  }

  let x: Extract;
  try {
    await assertAiCredit(supabase, subscription?.plan ?? 'trial');
    x = await generateJson<Extract>({
      system: SYSTEM_BASE + '\nIn questa sezione leggi screenshot di Instagram (profilo, Insight, singoli contenuti) e trascrivi i numeri esattamente come appaiono. Non stimare: se un numero non si vede usa -1. "1,2K" = 1200, "3,4 Mln" = 3400000.',
      prompt: [...images, { type: 'text', text: `Oggi è ${today()}. Estrai i numeri del profilo e di ogni contenuto visibile.` }],
      schema: EXTRACT_SCHEMA,
      effort: 'low',
    });
    await recordAiUse(supabase, 'analisi');
  } catch (e) {
    if (e instanceof AiError) fail('/social', e.message);
    throw e;
  }

  const val = (v: number) => (v >= 0 ? v : null);
  let saved = 0;
  if (x.follower >= 0) {
    await supabase.from('social_snapshots').upsert({
      platform: 'instagram', taken_on: today(), followers: x.follower,
      reach: val(x.account_raggiunti), profile_visits: val(x.visite_profilo), link_clicks: val(x.clic_link),
    }, { onConflict: 'owner_id,platform,taken_on' });
  }
  const posts = x.contenuti.filter((c) => c.copertura >= 0 || c.mi_piace >= 0).map((c) => ({
    platform: 'instagram', published_on: /^\d{4}-\d{2}-\d{2}$/.test(c.data) ? c.data : today(), format: c.formato,
    topic: c.tema.slice(0, 80) || null, reach: Math.max(0, c.copertura), likes: Math.max(0, c.mi_piace),
    comments: Math.max(0, c.commenti), saves: Math.max(0, c.salvataggi), shares: Math.max(0, c.condivisioni),
    followers_base: x.follower >= 0 ? x.follower : null,
  }));
  if (posts.length) {
    const { error } = await supabase.from('social_posts').insert(posts);
    if (!error) saved = posts.length;
  }

  revalidatePath('/social');
  revalidatePath('/dashboard');
  if (x.follower < 0 && !saved) fail('/social', 'Non ho trovato numeri leggibili: prova con gli screenshot della sezione Insight.');
  done('/social', `Letti gli screenshot: ${x.follower >= 0 ? `${x.follower} follower` : 'follower non visibili'}, ${saved} contenuti importati. Controlla i numeri qui sotto.`);
}
