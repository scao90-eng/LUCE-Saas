import Link from 'next/link';
import { notFound } from 'next/navigation';
import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import { requireSession } from '@/lib/session';
import { eur, dateIt, dateTimeIt, today } from '@/lib/format';
import { updateClient, deleteClient, addAppointment, completeAppointment, cancelAppointment } from '../actions';

const APPT_PILL: Record<string, string> = { prenotato: 'acc', svolto: 'ok', annullato: 'mut' };

export default async function ClientPage({ params, searchParams }: { params: { id: string }; searchParams: { ok?: string; error?: string } }) {
  const { supabase } = await requireSession();
  const [{ data: c }, { data: appts }, { data: txs }] = await Promise.all([
    supabase.from('clients').select('*').eq('id', params.id).maybeSingle(),
    supabase.from('appointments').select('*').eq('client_id', params.id).order('starts_at', { ascending: false }),
    supabase.from('transactions').select('*').eq('client_id', params.id).order('occurred_on', { ascending: false }),
  ]);
  if (!c) notFound();

  const spent = (txs ?? []).filter((t) => t.kind === 'entrata').reduce((s, t) => s + Number(t.amount), 0);
  const doneCount = (appts ?? []).filter((a) => a.status === 'svolto').length;

  return (
    <>
      <PageHeader title={c.full_name} sub={`Cliente dal ${dateIt(c.created_at)}`}>
        <Link className="btn sm" href="/clienti">← Tutti i clienti</Link>
      </PageHeader>
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <div className="grid g3">
          <div className="card kpi"><div className="lbl">Sedute svolte</div><div className="val">{doneCount}</div></div>
          <div className="card kpi"><div className="lbl">Totale speso</div><div className="val">{eur(spent)}</div></div>
          <div className="card kpi"><div className="lbl">Valore medio seduta</div><div className="val">{doneCount ? eur(spent / doneCount) : '—'}</div></div>
        </div>

        <div className="grid g2" style={{ marginTop: 14, alignItems: 'start' }}>
          <div className="card pad">
            <h3>Scheda</h3>
            <form action={updateClient}>
              <input type="hidden" name="id" value={c.id} />
              <div className="form-grid">
                <div className="form-full"><label className="fld" htmlFor="full_name">Nome e cognome</label><input className="fin" id="full_name" name="full_name" defaultValue={c.full_name} required /></div>
                <div><label className="fld" htmlFor="email">Email</label><input className="fin" id="email" name="email" type="email" defaultValue={c.email ?? ''} /></div>
                <div><label className="fld" htmlFor="phone">Telefono</label><input className="fin" id="phone" name="phone" defaultValue={c.phone ?? ''} /></div>
                <div><label className="fld" htmlFor="birth_date">Data di nascita</label><input className="fin" id="birth_date" name="birth_date" type="date" defaultValue={c.birth_date ?? ''} /></div>
                <div><label className="fld" htmlFor="status">Stato</label>
                  <select className="fin" id="status" name="status" defaultValue={c.status}><option value="attivo">Attivo</option><option value="lead">Lead</option><option value="inattivo">Inattivo</option></select></div>
                <div className="form-full"><label className="fld" htmlFor="source">Provenienza</label><input className="fin" id="source" name="source" defaultValue={c.source ?? ''} /></div>
                <div className="form-full"><label className="fld" htmlFor="notes">Note (percorso, obiettivi, preferenze)</label><textarea className="fin" id="notes" name="notes" rows={5} defaultValue={c.notes ?? ''} /></div>
              </div>
              <div className="form-actions"><button className="btn pri" type="submit">Salva</button></div>
            </form>
            <form action={deleteClient} style={{ marginTop: 8 }}>
              <input type="hidden" name="id" value={c.id} />
              <button className="btn sm ghost" type="submit">Elimina cliente</button>
            </form>
          </div>

          <div>
            <div className="card pad">
              <h3>Nuova seduta</h3>
              <form action={addAppointment}>
                <input type="hidden" name="client_id" value={c.id} />
                <div className="form-grid">
                  <div className="form-full"><label className="fld" htmlFor="service">Servizio</label><input className="fin" id="service" name="service" placeholder="es. Trattamento reiki" required /></div>
                  <div><label className="fld" htmlFor="date">Data</label><input className="fin" type="date" id="date" name="date" defaultValue={today()} required /></div>
                  <div><label className="fld" htmlFor="time">Ora</label><input className="fin" type="time" id="time" name="time" defaultValue="10:00" /></div>
                  <div><label className="fld" htmlFor="price">Prezzo (€)</label><input className="fin" id="price" name="price" inputMode="decimal" /></div>
                </div>
                <div className="form-actions"><button className="btn pri" type="submit">Aggiungi</button></div>
              </form>
            </div>

            <div className="sec-label">Storico sedute</div>
            <div className="card tbl-wrap">
              {appts?.length ? (
                <table className="tbl">
                  <tbody>
                    {appts.map((a) => (
                      <tr key={a.id}>
                        <td>{dateTimeIt(a.starts_at)}</td>
                        <td>{a.service}</td>
                        <td className="r">{Number(a.price) ? eur(Number(a.price)) : ''}</td>
                        <td><span className={`pill ${APPT_PILL[a.status]}`}>{a.status}</span></td>
                        <td className="r">
                          {a.status === 'prenotato' && (
                            <div className="toolbar" style={{ justifyContent: 'flex-end' }}>
                              <form action={completeAppointment}><input type="hidden" name="id" value={a.id} /><input type="hidden" name="register" value="1" />
                                <button className="btn sm" type="submit" title="Segna svolta e registra l'incasso">✓ Svolta</button></form>
                              <form action={cancelAppointment}><input type="hidden" name="id" value={a.id} /><button className="btn sm ghost" type="submit">Annulla</button></form>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="pad muted">Nessuna seduta registrata.</p>}
            </div>
            <p className="muted small" style={{ marginTop: 8 }}>Segnando una seduta come svolta, il suo prezzo viene registrato tra le entrate.</p>
          </div>
        </div>
      </div>
    </>
  );
}
