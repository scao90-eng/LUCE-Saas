import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import { requireSession } from '@/lib/session';
import { dateIt } from '@/lib/format';
import { generateCoachingPlan, toggleAction } from './actions';

export const maxDuration = 120;

type Action = { titolo: string; perche: string; come: string; metrica: string; fatto?: boolean };

export default async function CoConduzione({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const { supabase } = await requireSession();
  const { data: plans } = await supabase.from('coaching_plans').select('*').order('created_at', { ascending: false }).limit(8);
  const [current, ...history] = plans ?? [];

  return (
    <>
      <PageHeader title="Co-conduzione" sub="Luce legge i tuoi numeri e ti dice dove mettere le energie questa settimana" />
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <form action={generateCoachingPlan} className="card pad">
          <h3>Nuovo piano settimanale</h3>
          <p className="muted small">Usa i dati di <Link href="/gestionale">entrate e spese</Link>, <Link href="/clienti">clienti</Link> e <Link href="/social">analisi profilo</Link>. Più sono aggiornati, più i consigli sono precisi.</p>
          <label className="fld" htmlFor="focus">Su cosa vuoi concentrarti? (facoltativo)</label>
          <input className="fin" id="focus" name="focus" placeholder="es. riempire il workshop di novembre, trovare 5 nuovi clienti" />
          <div className="form-actions"><button className="btn pri" type="submit">✦ Genera il piano</button></div>
          <p className="muted small">La generazione richiede circa 20–40 secondi.</p>
        </form>

        {current ? (
          <>
            <div className="sec-label">Settimana del {dateIt(current.week_start)}</div>
            <div className="card pad"><p style={{ whiteSpace: 'pre-line' }}>{current.summary}</p></div>
            <div className="grid g2" style={{ marginTop: 14 }}>
              {(current.actions as Action[]).map((a, i) => (
                <div key={i} className={`card action-card${a.fatto ? ' done' : ''}`}>
                  <div className="row-between">
                    <h4>{i + 1}. {a.titolo}</h4>
                    <form action={toggleAction}>
                      <input type="hidden" name="id" value={current.id} /><input type="hidden" name="index" value={i} />
                      <button className="btn sm" type="submit">{a.fatto ? 'Riapri' : '✓ Fatto'}</button>
                    </form>
                  </div>
                  <div><span className="k">Perché</span><p>{a.perche}</p></div>
                  <div><span className="k">Come</span><p>{a.come}</p></div>
                  <div><span className="k">Cosa misurare</span><p>{a.metrica}</p></div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="card empty" style={{ marginTop: 14 }}><h3>Nessun piano ancora</h3><p>Genera il primo piano: bastano anche pochi dati per cominciare.</p></div>
        )}

        {history.length > 0 && (
          <>
            <div className="sec-label">Piani precedenti</div>
            <div className="card tbl-wrap">
              <table className="tbl"><tbody>
                {history.map((p) => {
                  const acts = p.actions as Action[];
                  return (
                    <tr key={p.id}>
                      <td>Settimana del {dateIt(p.week_start)}</td>
                      <td className="muted">{acts.map((a) => a.titolo).join(' · ')}</td>
                      <td className="r">{acts.filter((a) => a.fatto).length}/{acts.length} fatte</td>
                    </tr>
                  );
                })}
              </tbody></table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
