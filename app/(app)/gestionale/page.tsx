import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import { MoneyBars } from '@/components/Bars';
import { requireSession } from '@/lib/session';
import { monthlyTotals, byCategory, type Tx } from '@/lib/insights';
import { eur, dateIt, monthStart, monthLabel, today } from '@/lib/format';
import { addTransaction, deleteTransaction } from './actions';

const IN_CATS = ['Sedute individuali', 'Corsi e classi', 'Pacchetti', 'Workshop e ritiri', 'Prodotti', 'Online'];
const OUT_CATS = ['Affitto sala', 'Materiali', 'Formazione', 'Pubblicità', 'Software e abbonamenti', 'Tasse e contributi', 'Trasporti'];

export default async function Gestionale({ searchParams }: { searchParams: { mese?: string; ok?: string; error?: string } }) {
  const { supabase } = await requireSession();
  const mese = /^\d{4}-\d{2}$/.test(searchParams.mese ?? '') ? searchParams.mese! : monthStart().slice(0, 7);
  const [y, m] = mese.split('-').map(Number);
  const from = `${mese}-01`;
  const to = new Date(y, m, 1).toLocaleDateString('sv-SE');

  const [{ data: monthTx }, { data: yearTx }, { data: clients }] = await Promise.all([
    supabase.from('transactions').select('id,kind,amount,category,description,occurred_on,method,clients(full_name)')
      .gte('occurred_on', from).lt('occurred_on', to).order('occurred_on', { ascending: false }),
    supabase.from('transactions').select('kind,amount,category,occurred_on').gte('occurred_on', monthStart(-11)),
    supabase.from('clients').select('id,full_name').order('full_name'),
  ]);

  const list = (monthTx ?? []) as unknown as (Tx & { id: string; description: string | null; method: string | null; clients: { full_name: string } | null })[];
  const tot = monthlyTotals(list)[0] ?? { entrate: 0, spese: 0, margine: 0 };
  const shift = (d: number) => new Date(y, m - 1 + d, 1).toLocaleDateString('sv-SE').slice(0, 7);

  return (
    <>
      <PageHeader title="Entrate e spese" sub="Tieni sotto controllo quanto entra, quanto esce e cosa ti fa guadagnare davvero">
        <div className="toolbar">
          <Link className="btn sm" href={`/gestionale?mese=${shift(-1)}`}>‹</Link>
          <b>{monthLabel(mese)}</b>
          <Link className="btn sm" href={`/gestionale?mese=${shift(1)}`}>›</Link>
        </div>
      </PageHeader>
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <div className="grid g3">
          <div className="card kpi"><div className="lbl">Entrate</div><div className="val up">{eur(tot.entrate)}</div></div>
          <div className="card kpi"><div className="lbl">Spese</div><div className="val down">{eur(tot.spese)}</div></div>
          <div className="card kpi"><div className="lbl">Margine</div><div className="val">{eur(tot.margine)}</div></div>
        </div>

        <details className="card pad add" style={{ marginTop: 14 }} open={!list.length}>
          <summary className="btn pri">+ Registra movimento</summary>
          <form action={addTransaction}>
            <div className="form-grid">
              <div><label className="fld" htmlFor="kind">Tipo</label>
                <select className="fin" id="kind" name="kind" defaultValue="entrata"><option value="entrata">Entrata</option><option value="spesa">Spesa</option></select></div>
              <div><label className="fld" htmlFor="amount">Importo (€)</label><input className="fin" id="amount" name="amount" inputMode="decimal" required /></div>
              <div><label className="fld" htmlFor="category">Categoria</label>
                <input className="fin" id="category" name="category" list="cats" required placeholder="Scegli o scrivi" />
                <datalist id="cats">{[...IN_CATS, ...OUT_CATS].map((c) => <option key={c} value={c} />)}</datalist></div>
              <div><label className="fld" htmlFor="occurred_on">Data</label><input className="fin" type="date" id="occurred_on" name="occurred_on" defaultValue={today()} /></div>
              <div><label className="fld" htmlFor="method">Metodo</label>
                <select className="fin" id="method" name="method" defaultValue=""><option value="">—</option><option>Contanti</option><option>Carta</option><option>Bonifico</option><option>Satispay</option></select></div>
              <div><label className="fld" htmlFor="client_id">Cliente (facoltativo)</label>
                <select className="fin" id="client_id" name="client_id" defaultValue=""><option value="">—</option>{clients?.map((c) => <option key={c.id} value={c.id}>{c.full_name}</option>)}</select></div>
              <div className="form-full"><label className="fld" htmlFor="description">Nota</label><input className="fin" id="description" name="description" /></div>
            </div>
            <div className="form-actions"><button className="btn pri" type="submit">Salva</button></div>
          </form>
        </details>

        <div className="grid g2" style={{ marginTop: 14 }}>
          <div className="card pad"><h3>Ultimi 12 mesi</h3>{(yearTx ?? []).length ? <MoneyBars data={monthlyTotals((yearTx ?? []) as Tx[])} /> : <p className="muted">Ancora nessun dato.</p>}</div>
          <div className="card pad">
            <h3>Da dove arrivano i guadagni</h3>
            {byCategory(list, 'entrata').map((c) => (
              <div key={c.category} style={{ marginBottom: 8 }}>
                <div className="row-between small"><span>{c.category}</span><b>{eur(c.total)}</b></div>
                <div className="hbar"><span style={{ width: `${(c.total / Math.max(tot.entrate, 1)) * 100}%` }} /></div>
              </div>
            ))}
            {byCategory(list, 'spesa').length > 0 && <h3 style={{ marginTop: 16 }}>Dove vanno le spese</h3>}
            {byCategory(list, 'spesa').map((c) => (
              <div key={c.category} style={{ marginBottom: 8 }}>
                <div className="row-between small"><span>{c.category}</span><b>{eur(c.total)}</b></div>
                <div className="hbar"><span style={{ width: `${(c.total / Math.max(tot.spese, 1)) * 100}%`, background: 'var(--accent)' }} /></div>
              </div>
            ))}
            {!list.length && <p className="muted">Nessun movimento in questo mese.</p>}
          </div>
        </div>

        <div className="sec-label">Movimenti di {monthLabel(mese)}</div>
        <div className="card tbl-wrap">
          {list.length ? (
            <table className="tbl">
              <thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Nota</th><th>Cliente</th><th className="r">Importo</th><th /></tr></thead>
              <tbody>
                {list.map((t) => (
                  <tr key={t.id}>
                    <td>{dateIt(t.occurred_on)}</td>
                    <td><span className={`pill ${t.kind === 'entrata' ? 'ok' : 'acc'}`}>{t.kind}</span></td>
                    <td>{t.category}</td>
                    <td className="muted">{t.description ?? ''}{t.method ? ` · ${t.method}` : ''}</td>
                    <td>{t.clients?.full_name ?? ''}</td>
                    <td className={`r ${t.kind === 'entrata' ? 'up' : 'down'}`}>{t.kind === 'entrata' ? '+' : '−'}{eur(Number(t.amount))}</td>
                    <td className="r"><form action={deleteTransaction}><input type="hidden" name="id" value={t.id} /><button className="btn sm ghost" type="submit" aria-label="Elimina">✕</button></form></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty"><h3>Nessun movimento</h3><p>Registra la prima entrata o spesa del mese.</p></div>}
        </div>
      </div>
    </>
  );
}
