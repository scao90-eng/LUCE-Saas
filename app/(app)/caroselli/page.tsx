import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import SubmitButton from '@/components/SubmitButton';
import { requireSession } from '@/lib/session';
import { DESIGNS } from '@/lib/carousel';
import { dateIt } from '@/lib/format';
import { generateCarousel } from './actions';

export const maxDuration = 120;

export default async function Caroselli({ searchParams }: { searchParams: { tema?: string; da?: string; ok?: string; error?: string } }) {
  const { supabase, profile } = await requireSession();
  const { data } = await supabase.from('content_items').select('id,title,created_at,status,slides')
    .eq('format', 'carosello').not('slides', 'is', null).order('created_at', { ascending: false }).limit(24);

  return (
    <>
      <PageHeader title="Caroselli" sub="Slide pronte da scaricare e pubblicare, con i tuoi colori" />
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <form action={generateCarousel} className="card pad">
          <h3>Nuovo carosello</h3>
          {searchParams.da && <input type="hidden" name="da" value={searchParams.da} />}
          <div className="form-grid">
            <div className="form-full"><label className="fld" htmlFor="tema">Tema</label>
              <input className="fin" id="tema" name="tema" defaultValue={searchParams.tema} required placeholder="es. 5 errori che bloccano la tua pratica di meditazione" /></div>
            <div><label className="fld" htmlFor="numero">Numero di slide</label>
              <select className="fin" id="numero" name="numero" defaultValue="7">{[4, 5, 6, 7, 8, 10].map((n) => <option key={n}>{n}</option>)}</select></div>
            <div><label className="fld" htmlFor="design">Stile</label>
              <select className="fin" id="design" name="design" defaultValue={profile.carousel_design ?? 'crema'}>
                {Object.entries(DESIGNS).map(([id, d]) => <option key={id} value={id}>{d.label}</option>)}
              </select></div>
          </div>
          <div className="form-actions"><SubmitButton pendingText="Creazione delle slide…">❖ Crea le slide</SubmitButton></div>
          <p className="muted small">Colore e nome profilo sulle slide si impostano in <Link href="/impostazioni">Profilo attività</Link>.</p>
        </form>

        <div className="sec-label">I tuoi caroselli</div>
        {data?.length ? (
          <div className="grid g4">
            {data.map((c) => (
              <Link key={c.id} href={`/caroselli/${c.id}`} className="card" style={{ overflow: 'hidden' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={`/api/caroselli/${c.id}/1`} alt={`Copertina: ${c.title}`} style={{ width: '100%', aspectRatio: '4 / 5', display: 'block', background: 'var(--line-soft)' }} loading="lazy" />
                <div style={{ padding: '10px 12px' }}>
                  <b className="small">{c.title}</b>
                  <div className="muted small">{(c.slides as unknown[]).length} slide · {dateIt(c.created_at)}</div>
                </div>
              </Link>
            ))}
          </div>
        ) : <div className="card empty"><h3>Nessun carosello</h3><p>Scrivi un tema, oppure parti dalle idee dell&apos;analisi del profilo o dal piano contenuti.</p></div>}
      </div>
    </>
  );
}
