import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ImageResponse } from 'next/og';

// Slide 1080×1350 (formato 4:5, quello consigliato da Instagram per i caroselli).
export const SLIDE_W = 1080;
export const SLIDE_H = 1350;

export type Slide = { tipo: 'copertina' | 'contenuto' | 'chiusura'; titolo: string; testo: string };
export type DesignId = 'crema' | 'salvia' | 'terracotta' | 'notte';

export const DESIGNS: Record<DesignId, { label: string; bg: (brand: string) => string; ink: string; soft: string; accent: (brand: string) => string }> = {
  crema: { label: 'Crema', bg: () => '#F7F1E8', ink: '#2B2620', soft: '#6F665B', accent: (b) => b },
  salvia: { label: 'Salvia', bg: () => '#DCE5D6', ink: '#223022', soft: '#4E5E4C', accent: (b) => b },
  terracotta: { label: 'Colore brand', bg: (b) => b, ink: '#FFF9F2', soft: '#FBE9DC', accent: () => '#FFF9F2' },
  notte: { label: 'Notte', bg: () => '#1F2620', ink: '#F2EDE4', soft: '#B9C2B3', accent: (b) => b },
};

export const isDesign = (d: unknown): d is DesignId => typeof d === 'string' && d in DESIGNS;

let fonts: { name: string; data: Buffer; weight: 400 | 600 | 700; style: 'normal' }[] | null = null;
async function loadFonts() {
  if (fonts) return fonts;
  const dir = path.join(process.cwd(), 'assets/fonts');
  const [regular, bold, display] = await Promise.all([
    readFile(path.join(dir, 'dm-sans-latin-400-normal.woff')),
    readFile(path.join(dir, 'dm-sans-latin-700-normal.woff')),
    readFile(path.join(dir, 'fraunces-latin-600-normal.woff')),
  ]);
  fonts = [
    { name: 'DM Sans', data: regular, weight: 400, style: 'normal' },
    { name: 'DM Sans', data: bold, weight: 700, style: 'normal' },
    { name: 'Fraunces', data: display, weight: 600, style: 'normal' },
  ];
  return fonts;
}

// Il renderer non ha glifi per le emoji: le togliamo per evitare quadratini.
const clean = (s: string) => s.replace(/\p{Extended_Pictographic}|️/gu, '').replace(/\s{2,}/g, ' ').trim();

// Corpo del testo più piccolo quando il testo è lungo.
const fit = (text: string, sizes: [number, number][]) => sizes.find(([max]) => text.length <= max)?.[1] ?? sizes[sizes.length - 1][1];

function SlideView({ slide, index, total, design, brand, handle, business }: {
  slide: Slide; index: number; total: number; design: DesignId; brand: string; handle: string; business: string;
}) {
  const d = DESIGNS[design];
  const bg = d.bg(brand), accent = d.accent(brand);
  const titolo = clean(slide.titolo), testo = clean(slide.testo);
  const isCover = slide.tipo === 'copertina', isEnd = slide.tipo === 'chiusura';

  return (
    <div style={{ width: SLIDE_W, height: SLIDE_H, display: 'flex', flexDirection: 'column', background: bg, color: d.ink, fontFamily: 'DM Sans', padding: '96px 96px 80px', position: 'relative' }}>
      {/* "luce": cerchio decorativo */}
      <div style={{ position: 'absolute', display: 'flex', width: 620, height: 620, borderRadius: 620, right: -200, top: -180, background: accent, opacity: 0.13 }} />
      <div style={{ position: 'absolute', display: 'flex', width: 300, height: 300, borderRadius: 300, left: -120, bottom: 120, border: `3px solid ${accent}`, opacity: 0.25 }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 30, color: d.soft, letterSpacing: 2 }}>
        <span>{(business || handle).toUpperCase()}</span>
        <span>{index + 1}/{total}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, justifyContent: isCover ? 'center' : 'flex-start', marginTop: isCover ? 0 : 120 }}>
        {!isCover && !isEnd && (
          <div style={{ display: 'flex', fontFamily: 'Fraunces', fontSize: 120, color: accent, lineHeight: 1, marginBottom: 36 }}>
            {String(index).padStart(2, '0')}
          </div>
        )}
        <div style={{ display: 'flex', fontFamily: 'Fraunces', fontWeight: 600, lineHeight: 1.08, letterSpacing: -1,
          fontSize: isCover ? fit(titolo, [[40, 112], [70, 92], [110, 76]]) : fit(titolo, [[40, 76], [80, 64]]) }}>
          {titolo}
        </div>
        {testo && (
          <div style={{ display: 'flex', marginTop: 44, lineHeight: 1.4, color: isCover ? d.soft : d.ink,
            fontSize: fit(testo, [[90, 46], [170, 40], [260, 35]]) }}>
            {testo}
          </div>
        )}
        {isEnd && handle && (
          <div style={{ display: 'flex', marginTop: 64 }}>
            <div style={{ display: 'flex', background: accent, color: bg, fontWeight: 700, fontSize: 38, padding: '22px 40px', borderRadius: 999 }}>
              @{handle}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 30, color: d.soft }}>
        <span>{handle ? `@${handle}` : ''}</span>
        {index < total - 1
          ? <span style={{ display: 'flex', color: accent, fontWeight: 700 }}>Scorri →</span>
          : <span style={{ display: 'flex', color: accent, fontWeight: 700 }}>Salva il post</span>}
      </div>
    </div>
  );
}

export async function renderSlide(opts: {
  slides: Slide[]; index: number; design: DesignId; brand: string; handle: string; business: string;
  headers?: Record<string, string>;
}) {
  return new ImageResponse(
    <SlideView slide={opts.slides[opts.index]} index={opts.index} total={opts.slides.length}
      design={opts.design} brand={opts.brand} handle={opts.handle} business={opts.business} />,
    { width: SLIDE_W, height: SLIDE_H, fonts: await loadFonts(), headers: opts.headers },
  );
}

export const slugify = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'carosello';
