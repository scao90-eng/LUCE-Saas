import { NextResponse } from 'next/server';
import { zipSync } from 'fflate';
import { renderSlide, slugify } from '@/lib/carousel';
import { loadCarousel } from '@/lib/carousel-data';

export const maxDuration = 60;

// Tutte le slide in un unico .zip, numerate nell'ordine di pubblicazione.
export async function GET(_request: Request, { params }: { params: { id: string } }) {
  const c = await loadCarousel(params.id);
  if (!c) return NextResponse.json({ error: 'non trovato' }, { status: 404 });
  const slug = slugify(c.title);
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < c.slides.length; i++) {
    const png = await (await renderSlide({ ...c, index: i })).arrayBuffer();
    files[`${slug}-${String(i + 1).padStart(2, '0')}.png`] = new Uint8Array(png);
  }
  const zip = zipSync(files, { level: 0 });
  return new NextResponse(zip, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${slug}.zip"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
