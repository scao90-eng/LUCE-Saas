import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import { requireSession } from '@/lib/session';
import { eur, dateIt } from '@/lib/format';
import { addClient } from './actions';

const STATUS_PILL: Record<string, string> = { attivo: 'ok', lead: 'acc', inattivo: 'mut' };

export default async function Clienti({ searchParams }: { searchParams: { q?: string; stato?: string; ok?: string; error?: string } }) {
  const { supabase } = await requireSession();
  let query = supabase.from('clients').select('id,full_name,email,phone,status,source,created_at,transactions(amount,kind),appointments(starts_at,status)').order('full_name');
  if (searchParams.q) query = query.ilike('full_name', `%${searchParams.q.replace(/[%_]/g, '')}%`);
  if (searchParams.stato) query = query.eq('status', searchParams.stato);
  const { data } = await query;

  const rows = (data ?? []).map((c) => {
    const spent = (c.transactions as { amount: number; kind: string }[]).filter((t) => t.kind === 'entrata').reduce((s, t) => s + Number(t.amount), 0);
    const done = (c.appointments as { starts_at: string; status: string }[]).filter((a) => a.status === 'svolto').map((a) => a.starts_at).sort();
    return { ...c, spent, sessions: done.length, last: done[done.length - 1] ?? null };
  });

  return (
    <>
      <PageHeader title="Clienti" sub={`${rows.length} ${rows.length === 1 ? 'persona' : 'persone'}`}>
        <form className="toolbar" method="get">
          <input className="fin" name="q" placeholder="Cerca per nome" defaultValue={searchParams.q} style={{ width: 200 }} />
          <select className="fin" name="stato" defaultValue={searchParams.stato ?? ''} style={{ width: 130 }}>
            <option value="">Tutti</option><option value="attivo">Attivi</option><option value="lead">Lead</option><option value="inattivo">Inattivi</option>
          </select>
          <button className="btn sm" type="submit">Filtra</button>
        </form>
      </PageHeader>
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <details className="card pad add">
          <summary className="btn pri">+ Nuovo cliente</summary>
          <form action={addClient}>
            <div className="form-grid">
              <div><label className="fld" htmlFor="full_name">Nome e cognome</label><input className="fin" id="full_name" name="full_name" required /></div>
              <div><label className="fld" htmlFor="email">Email</label><input className="fin" type="email" id="email" name="email" /></div>
              <div><label className="fld" htmlFor="phone">Telefono</label><input className="fin" id="phone" name="phone" /></div>
              <div><label className="fld" htmlFor="source">Come ti ha conosciuto</label>
                <select className="fin" id="source" name="source" defaultValue=""><option value="">—</option><option>Instagram</option><option>Facebook</option><option>Passaparola</option><option>Evento</option><option>Sito web</option><option>Altro</option></select></div>
              <div><label className="fld" htmlFor="status">Stato</label>
                <select className="fin" id="status" name="status" defaultValue="attivo"><option value="attivo">Attivo</option><option value="lead">Lead (non ancora cliente)</option></select></div>
              <div className="form-full"><label className="fld" htmlFor="notes">Note</label><textarea className="fin" id="notes" name="notes" rows={2} /></div>
            </div>
            <div className="form-actions"><button className="btn pri" type="submit">Crea scheda</button></div>
          </form>
        </details>

        <div className="card tbl-wrap" style={{ marginTop: 14 }}>
          {rows.length ? (
            <table className="tbl">
              <thead><tr><th>Nome</th><th>Stato</th><th>Contatti</th><th>Provenienza</th><th className="r">Sedute</th><th>Ultima</th><th className="r">Totale speso</th></tr></thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id}>
                    <td><Link className="lnk" href={`/clienti/${c.id}`}>{c.full_name}</Link></td>
                    <td><span className={`pill ${STATUS_PILL[c.status] ?? 'mut'}`}>{c.status}</span></td>
                    <td className="muted small">{[c.phone, c.email].filter(Boolean).join(' · ')}</td>
                    <td>{c.source ?? ''}</td>
                    <td className="r">{c.sessions}</td>
                    <td>{c.last ? dateIt(c.last) : '—'}</td>
                    <td className="r">{eur(c.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div className="empty"><h3>Nessun cliente</h3><p>Aggiungi le persone che segui: storico sedute e incassi si collegano in automatico.</p></div>}
        </div>
      </div>
    </>
  );
}
