// Analisi di un profilo Instagram dal link, tramite la Business Discovery API di Meta:
// restituisce i dati PUBBLICI di qualsiasi account professionale (business o creator).
// Serve un solo account Instagram professionale "della piattaforma" collegato a un'app Meta:
// META_ACCESS_TOKEN (token di lunga durata) + META_IG_USER_ID (id di quell'account).

export type IgMedia = {
  id: string; caption?: string; like_count?: number; comments_count?: number;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM'; media_product_type?: 'FEED' | 'REELS' | 'STORY';
  timestamp: string; permalink?: string;
};
export type IgProfile = {
  username: string; name?: string; biography?: string; website?: string;
  followers_count: number; follows_count?: number; media_count: number; media: IgMedia[];
};

export class IgError extends Error {}

export function igConfigured() {
  return Boolean(process.env.META_ACCESS_TOKEN && process.env.META_IG_USER_ID);
}

// Accetta link (instagram.com/nome, con o senza parametri), "@nome" o "nome".
export function parseUsername(input: string): string | null {
  const s = input.trim();
  const fromUrl = s.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1];
  const name = (fromUrl ?? s).replace(/^@/, '').replace(/\/$/, '');
  if (['p', 'reel', 'reels', 'stories', 'explore'].includes(name.toLowerCase())) return null;
  return /^[A-Za-z0-9._]{1,30}$/.test(name) ? name.toLowerCase() : null;
}

export async function fetchPublicProfile(username: string): Promise<IgProfile> {
  if (!igConfigured()) throw new IgError('Analisi da link non ancora attiva: usa l\'analisi da screenshot.');
  const version = process.env.META_GRAPH_VERSION ?? 'v23.0';
  const fields = `business_discovery.username(${username}){username,name,biography,website,followers_count,follows_count,media_count,` +
    `media.limit(30){id,caption,like_count,comments_count,media_type,media_product_type,timestamp,permalink}}`;
  const url = `https://graph.facebook.com/${version}/${process.env.META_IG_USER_ID}?fields=${encodeURIComponent(fields)}` +
    `&access_token=${process.env.META_ACCESS_TOKEN}`;

  const res = await fetch(url, { cache: 'no-store' });
  const json = await res.json();
  if (!res.ok || json.error) {
    // Errore tipico: profilo inesistente, privato o personale (non professionale).
    throw new IgError(`Non riesco a leggere @${username}: il profilo deve esistere, essere pubblico e di tipo professionale (business o creator).`);
  }
  const bd = json.business_discovery;
  return { ...bd, media: bd.media?.data ?? [] };
}

export const igFormat = (m: IgMedia): 'reel' | 'carosello' | 'post' =>
  m.media_product_type === 'REELS' || m.media_type === 'VIDEO' ? 'reel' : m.media_type === 'CAROUSEL_ALBUM' ? 'carosello' : 'post';

const DAYS = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

// Numeri pubblici calcolati sugli ultimi contenuti.
export function publicStats(p: IgProfile) {
  const media = p.media;
  const inter = (m: IgMedia) => (m.like_count ?? 0) + (m.comments_count ?? 0);
  const er = (m: IgMedia) => (p.followers_count ? inter(m) / p.followers_count : 0);
  const times = media.map((m) => Date.parse(m.timestamp)).sort((a, b) => a - b);
  const spanWeeks = times.length > 1 ? (times[times.length - 1] - times[0]) / (7 * 86_400_000) : 0;

  const byFormat: Record<string, { n: number; er: number }> = {};
  const byDay: Record<string, { n: number; er: number }> = {};
  for (const m of media) {
    const f = igFormat(m);
    byFormat[f] = { n: (byFormat[f]?.n ?? 0) + 1, er: (byFormat[f]?.er ?? 0) + er(m) };
    const d = DAYS[new Date(m.timestamp).getDay()];
    byDay[d] = { n: (byDay[d]?.n ?? 0) + 1, er: (byDay[d]?.er ?? 0) + er(m) };
  }
  const formats = Object.entries(byFormat).map(([format, v]) => ({ format, n: v.n, avgEr: v.er / v.n })).sort((a, b) => b.avgEr - a.avgEr);
  const bestDay = Object.entries(byDay).sort((a, b) => b[1].er / b[1].n - a[1].er / a[1].n)[0]?.[0] ?? null;
  const top = [...media].sort((a, b) => inter(b) - inter(a)).slice(0, 5);

  return {
    username: p.username, name: p.name ?? null, biography: p.biography ?? '', website: p.website ?? null,
    followers: p.followers_count, following: p.follows_count ?? null, mediaCount: p.media_count,
    analyzed: media.length,
    avgLikes: media.length ? media.reduce((s, m) => s + (m.like_count ?? 0), 0) / media.length : 0,
    avgComments: media.length ? media.reduce((s, m) => s + (m.comments_count ?? 0), 0) / media.length : 0,
    avgEr: media.length ? media.reduce((s, m) => s + er(m), 0) / media.length : 0,
    postsPerWeek: spanWeeks > 0 ? media.length / spanWeeks : null,
    avgHashtags: media.length ? media.reduce((s, m) => s + (m.caption?.match(/#\w+/g)?.length ?? 0), 0) / media.length : 0,
    formats, bestDay,
    top: top.map((m) => ({ format: igFormat(m), likes: m.like_count ?? 0, comments: m.comments_count ?? 0, caption: (m.caption ?? '').slice(0, 160), permalink: m.permalink ?? null })),
  };
}
export type PublicStats = ReturnType<typeof publicStats>;
