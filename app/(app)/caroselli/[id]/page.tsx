import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import CopyButton from '@/components/CopyButton';
import { requireSession } from '@/lib/session';
import { DESIGNS, type Slide } from '@/lib/carousel';
import { updateCarousel } from '../actions';
import { setContentStatus } from '../../contenuti/actions';

export default async function CarouselPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const { supabase } = await requireSession();
  const { data: c } = await supabase.from('content_items').select('*').eq('id', params.id).maybeSingle();
  if (!c?.slides) notFound();
  const slides = c.slides as Slide[];
  const v = Date.now(); // evita immagini vecchie in cache dopo una modifica
  const fullCaption = [c.caption, c.hashtags].filter(Boolean).join('\n\n');

  return (
    <>
      <PageHeader title={c.title} sub={`${slides.length} slide · 1080×1350 px`}>
        <div className="toolbar">
          <Link className="btn sm" href="/caroselli">← Caroselli</Link>
          <a className="btn pri" href={`/api/caroselli/${c.id}/zip`}>⬇ Scarica tutte (.zip)</a>
        </div>
      </PageHeader>
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <div className="grid g4">
          {slides.map((_, i) => (
            <div key={i} className="card" style={{ overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/api/caroselli/${c.id}/${i + 1}?v=${v}`} alt={`Slide ${i + 1}`} style={{ width: '100%', aspectRatio: '4 / 5', display: 'block', background: 'var(--line-soft)' }} loading="lazy" />
              <div className="row-between" style={{ padding: '8px 10px' }}>
                <span className="small muted">Slide {i + 1}</span>
                <a className="btn sm" href={`/api/caroselli/${c.id}/${i + 1}?download=1`}>⬇ PNG</a>
              </div>
            </div>
          ))}
        </div>

        <div className="grid g2" style={{ marginTop: 14, alignItems: 'start' }}>
          <div className="card pad">
            <div className="row-between"><h3>Didascalia</h3>{fullCaption && <CopyButton text={fullCaption} label="Copia didascalia" />}</div>
            <div className="content-card" style={{ padding: 0 }}><pre>{fullCaption || 'Nessuna didascalia.'}</pre></div>
            <h3 style={{ marginTop: 16 }}>Come pubblicarlo</h3>
            <ol style={{ paddingLeft: 18 }} className="small">
              <li>Scarica lo .zip (o le singole slide) sul telefono.</li>
              <li>Su Instagram: + → Post → seleziona più foto, nell&apos;ordine numerato.</li>
              <li>Incolla la didascalia e pubblica.</li>
            </ol>
            {c.status !== 'pubblicato' && (
              <form action={setContentStatus} style={{ marginTop: 12 }}>
                <input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="pubblicato" />
                <button className="btn sm" type="submit">✓ Segna come pubblicato</button>
              </form>
            )}
          </div>

          <form action={updateCarousel} className="card pad">
            <input type="hidden" name="id" value={c.id} />
            <h3>Modifica le slide</h3>
            <label className="fld" htmlFor="design">Stile</label>
            <select className="fin" id="design" name="design" defaultValue={c.design ?? 'crema'}>
              {Object.entries(DESIGNS).map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
            </select>
            {slides.map((s, i) => (
              <div key={i} style={{ borderTop: '1px dashed var(--line)', marginTop: 14, paddingTop: 4 }}>
                <label className="fld" htmlFor={`titolo_${i}`}>Slide {i + 1} · {s.tipo}</label>
                <input className="fin" id={`titolo_${i}`} name={`titolo_${i}`} defaultValue={s.titolo} />
                <textarea className="fin" name={`testo_${i}`} rows={2} defaultValue={s.testo} style={{ marginTop: 6 }} aria-label={`Testo slide ${i + 1}`} />
              </div>
            ))}
            <label className="fld" htmlFor="caption">Didascalia</label>
            <textarea className="fin" id="caption" name="caption" rows={5} defaultValue={c.caption ?? ''} />
            <label className="fld" htmlFor="hashtags">Hashtag</label>
            <input className="fin" id="hashtags" name="hashtags" defaultValue={c.hashtags ?? ''} />
            <div className="form-actions"><button className="btn pri" type="submit">Salva e rigenera</button></div>
          </form>
        </div>
      </div>
    </>
  );
}
