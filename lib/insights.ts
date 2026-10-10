import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/session';
import { monthStart } from '@/lib/format';

export type Tx = { kind: 'entrata' | 'spesa'; amount: number; category: string; occurred_on: string };
export type Snapshot = { platform: string; taken_on: string; followers: number; reach: number | null; profile_visits: number | null; link_clicks: number | null };
export type Post = { platform: string; published_on: string; format: string; topic: string | null; reach: number; likes: number; comments: number; saves: number; shares: number; followers_base?: number | null };

// ---------- Gestionale ----------
export function monthlyTotals(txs: Tx[]) {
  const map = new Map<string, { entrate: number; spese: number }>();
  for (const t of txs) {
    const k = t.occurred_on.slice(0, 7);
    const m = map.get(k) ?? { entrate: 0, spese: 0 };
    if (t.kind === 'entrata') m.entrate += Number(t.amount); else m.spese += Number(t.amount);
    map.set(k, m);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b))
    .map(([month, v]) => ({ month, ...v, margine: v.entrate - v.spese }));
}

export function byCategory(txs: Tx[], kind: 'entrata' | 'spesa') {
  const map = new Map<string, number>();
  for (const t of txs) if (t.kind === kind) map.set(t.category, (map.get(t.category) ?? 0) + Number(t.amount));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).map(([category, total]) => ({ category, total }));
}

// ---------- Social ----------
// Engagement rate di un contenuto: interazioni / copertura. Per i post importati
// da Instagram la copertura non è pubblica: si usa il numero di follower.
export const engagement = (p: Post) => {
  const base = p.reach > 0 ? p.reach : p.followers_base ?? 0;
  return base > 0 ? (p.likes + p.comments + p.saves + p.shares) / base : 0;
};

export function formatPerformance(posts: Post[]) {
  const map = new Map<string, { n: number; reach: number; er: number; saves: number }>();
  for (const p of posts) {
    const m = map.get(p.format) ?? { n: 0, reach: 0, er: 0, saves: 0 };
    m.n += 1; m.reach += p.reach; m.er += engagement(p); m.saves += p.saves;
    map.set(p.format, m);
  }
  return [...map.entries()].map(([format, m]) => ({
    format, n: m.n, avgReach: m.reach / m.n, avgEr: m.er / m.n, avgSaves: m.saves / m.n,
  })).sort((a, b) => b.avgEr - a.avgEr);
}

const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export function bestWeekday(posts: Post[]) {
  const map = new Map<number, { n: number; reach: number }>();
  for (const p of posts) {
    const d = new Date(p.published_on + 'T12:00:00').getDay();
    const m = map.get(d) ?? { n: 0, reach: 0 };
    m.n += 1; m.reach += p.reach; map.set(d, m);
  }
  const best = [...map.entries()].sort((a, b) => b[1].reach / b[1].n - a[1].reach / a[1].n)[0];
  return best ? DAYS[best[0]] : null;
}

export function followerGrowth(snaps: Snapshot[]) {
  if (snaps.length < 2) return null;
  const first = snaps[0], last = snaps[snaps.length - 1];
  const days = Math.max(1, (Date.parse(last.taken_on) - Date.parse(first.taken_on)) / 86_400_000);
  const delta = last.followers - first.followers;
  return { delta, perWeek: (delta / days) * 7, pct: first.followers ? delta / first.followers : 0, from: first.taken_on, to: last.taken_on };
}

// ---------- Contesto per l'AI ----------
// Riassunto compatto e anonimo (nessun nome di cliente) dei dati dell'operatore.
export async function buildAiContext(supabase: SupabaseClient, profile: Profile) {
  const since = monthStart(-3);
  const [{ data: txs }, { data: snaps }, { data: posts }, { count: activeClients }, { count: leads }] = await Promise.all([
    supabase.from('transactions').select('kind,amount,category,occurred_on').gte('occurred_on', since),
    supabase.from('social_snapshots').select('*').eq('platform', 'instagram').order('taken_on').limit(60),
    supabase.from('social_posts').select('*').order('published_on', { ascending: false }).limit(40),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'attivo'),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'lead'),
  ]);

  const tx = (txs ?? []) as Tx[];
  const sn = (snaps ?? []) as Snapshot[];
  const ps = (posts ?? []) as Post[];
  const growth = followerGrowth(sn);
  const lastSnap = sn[sn.length - 1];
  const top = [...ps].sort((a, b) => engagement(b) - engagement(a)).slice(0, 5);
  const flop = [...ps].sort((a, b) => engagement(a) - engagement(b)).slice(0, 3);

  const lines = [
    `## Operatore`,
    `Disciplina: ${profile.discipline || 'non indicata'} · Attività: ${profile.business_name || '—'} · Città: ${profile.city || '—'}`,
    `Pubblico target: ${profile.target || 'non indicato'} · Tono di voce: ${profile.tone || 'caldo, autentico, professionale'}`,
    ``,
    `## Attività (ultimi 3 mesi)`,
    ...monthlyTotals(tx).map((m) => `- ${m.month}: entrate ${m.entrate.toFixed(0)}€, spese ${m.spese.toFixed(0)}€, margine ${m.margine.toFixed(0)}€`),
    `Entrate per categoria: ${byCategory(tx, 'entrata').map((c) => `${c.category} ${c.total.toFixed(0)}€`).join(', ') || 'nessun dato'}`,
    `Spese per categoria: ${byCategory(tx, 'spesa').map((c) => `${c.category} ${c.total.toFixed(0)}€`).join(', ') || 'nessun dato'}`,
    `Clienti attivi: ${activeClients ?? 0} · Contatti in attesa (lead): ${leads ?? 0}`,
    ``,
    `## Instagram`,
    lastSnap ? `Follower attuali: ${lastSnap.followers}${lastSnap.reach != null ? `, copertura ultimo periodo ${lastSnap.reach}` : ''}${lastSnap.profile_visits != null ? `, visite profilo ${lastSnap.profile_visits}` : ''}${lastSnap.link_clicks != null ? `, clic link ${lastSnap.link_clicks}` : ''}` : 'Nessuna rilevazione del profilo.',
    growth ? `Crescita: ${growth.delta >= 0 ? '+' : ''}${growth.delta} follower dal ${growth.from} (${growth.perWeek.toFixed(1)}/settimana)` : '',
    `Rendimento per formato: ${formatPerformance(ps).map((f) => `${f.format} (n=${f.n}, copertura media ${f.avgReach.toFixed(0)}, engagement ${(f.avgEr * 100).toFixed(1)}%, salvataggi medi ${f.avgSaves.toFixed(1)})`).join('; ') || 'nessun contenuto registrato'}`,
    `Giorno con più copertura: ${bestWeekday(ps) ?? 'n.d.'}`,
    `Contenuti migliori: ${top.map((p) => `${p.format} "${p.topic ?? 'senza tema'}" ER ${(engagement(p) * 100).toFixed(1)}%`).join('; ') || '—'}`,
    `Contenuti più deboli: ${flop.map((p) => `${p.format} "${p.topic ?? 'senza tema'}" ER ${(engagement(p) * 100).toFixed(1)}%`).join('; ') || '—'}`,
  ];
  return lines.filter((l) => l !== '').join('\n');
}
