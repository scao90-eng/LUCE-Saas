import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import ContentCard, { type ContentItem } from '@/components/ContentCard';
import { requireSession } from '@/lib/session';
import { weekStart } from '@/lib/format';
import { generateEditorialPlan } from './actions';

export const maxDuration = 120;

export default async function Contenuti({ searchParams }: { searchParams: { stato?: string; ok?: string; error?: string } }) {
  const { supabase } = await requireSession();
  let q = supabase.from('content_items').select('*').order('planned_for', { ascending: true, nullsFirst: false }).limit(60);
  q = searchParams.stato ? q.eq('status', searchParams.stato) : q.neq('status', 'pubblicato');
  const { data } = await q;
  const items = (data ?? []) as ContentItem[];

  return (
    <>
      <PageHeader title="Piano contenuti" sub="Idee, didascalie e calendario costruiti sui tuoi dati">
        <form className="toolbar" method="get">
          <select className="fin" name="stato" defaultValue={searchParams.stato ?? ''} style={{ width: 170 }}>
            <option value="">Da pubblicare</option><option value="idea">Solo idee</option><option value="pronto">Pronti</option><option value="pubblicato">Pubblicati</option>
          </select>
          <button className="btn sm" type="submit">Mostra</button>
        </form>
      </PageHeader>
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <form action={generateEditorialPlan} className="card pad">
          <h3>Genera il piano della settimana</h3>
          <div className="form-grid">
            <div><label className="fld" htmlFor="week">Settimana dal</label><input className="fin" type="date" id="week" name="week" defaultValue={weekStart()} /></div>
            <div><label className="fld" htmlFor="count">Quanti contenuti</label>
              <select className="fin" id="count" name="count" defaultValue="5">{[3, 4, 5, 6, 7, 10].map((n) => <option key={n}>{n}</option>)}</select></div>
            <div className="form-full"><label className="fld" htmlFor="goal">Obiettivo (facoltativo)</label><input className="fin" id="goal" name="goal" placeholder="es. lanciare il corso di meditazione del giovedì" /></div>
          </div>
          <div className="form-actions"><button className="btn pri" type="submit">❖ Genera contenuti</button></div>
        </form>

        <div className="sec-label">{items.length} contenuti</div>
        {items.length ? (
          <div className="grid g2">{items.map((c) => <ContentCard key={c.id} c={c} />)}</div>
        ) : <div className="card empty"><h3>Nessun contenuto</h3><p>Genera il piano: Luce sceglie formati e temi in base a quello che funziona sul tuo profilo.</p></div>}
      </div>
    </>
  );
}
