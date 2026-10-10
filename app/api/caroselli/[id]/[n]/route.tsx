import { NextResponse } from 'next/server';
import { renderSlide, slugify } from '@/lib/carousel';
import { loadCarousel } from '@/lib/carousel-data';

// PNG di una slide. ?download=1 → scarica il file invece di mostrarlo.
export async function GET(request: Request, { params }: { params: { id: string; n: string } }) {
  const c = await loadCarousel(params.id);
  const index = Number(params.n) - 1;
  if (!c || !(index >= 0 && index < c.slides.length)) return NextResponse.json({ error: 'non trovato' }, { status: 404 });
  const download = new URL(request.url).searchParams.has('download');
  return renderSlide({
    ...c, index,
    headers: {
      'Cache-Control': 'private, no-store',
      ...(download ? { 'Content-Disposition': `attachment; filename="${slugify(c.title)}-${index + 1}.png"` } : {}),
    },
  });
}
