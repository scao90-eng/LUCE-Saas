import Link from 'next/link';
import PageHeader from '@/components/PageHeader';
import { MoneyBars } from '@/components/Bars';
import { requireSession } from '@/lib/session';
import { monthlyTotals, followerGrowth, type Tx, type Snapshot } from '@/lib/insights';
import { eur, num, monthStart, dateTimeIt, dateIt, today } from '@/lib/format';

export default async function Dashboard() {
  const { supabase, profile } = await requireSession();
  const [{ data: txs }, { count: activeClients }, { data: appts }, { data: snaps }, { data: plan }, { data: upcoming }] = await Promise.all([
    supabase.from('transactions').select('kind,amount,category,occurred_on').gte('occurred_on', monthStart(-5)),
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('status', 'attivo'),
    supabase.from('appointments').select('id,starts_at,service,client_id,clients(full_name)').eq('status', 'prenotato')
      .gte('starts_at', new Date().toISOString()).order('starts_at').limit(5),
    supabase.from('social_snapshots').select('*').eq('platform', 'instagram').order('taken_on'),
    supabase.from('coaching_plans').select('*').order('created_at', { ascending: false }).limit(1).maybeSingle(),
    supabase.from('content_items').select('id,title,format,planned_for').neq('status', 'pubblicato')
      .gte('planned_for', today()).order('planned_for').limit(5),
  ]);

  const months = monthlyTotals((txs ?? []) as Tx[]);
  const thisKey = monthStart().slice(0, 7), prevKey = monthStart(-1).slice(0, 7);
  const cur = months.find((m) => m.month === thisKey) ?? { entrate: 0, spese: 0, margine: 0 };
  const prev = months.find((m) => m.month === prevKey) ?? { entrate: 0, spese: 0, margine: 0 };
  const sn = (snaps ?? []) as Snapshot[];
  const growth = followerGrowth(sn.slice(-8));
  const actions = (plan?.actions ?? []) as { titolo: string; fatto?: boolean }[];
  const delta = (a: number, b: number) => (b ? `${a >= b ? '▲' : '▼'} ${Math.abs(((a - b) / b) * 100).toFixed(0)}% vs mese scorso` : 'primo mese registrato');

  return (
    <>
      <PageHeader title={`Ciao ${profile.full_name?.split(' ')[0] ?? ''}`.trim()} sub="Il punto della situazione, in un colpo d'occhio" />
      <div className="wrap">
        {!profile.discipline && (
          <div className="banner info">Completa il <Link href="/impostazioni"><b>profilo attività</b></Link>: disciplina, pubblico e tono servono all&apos;AI per consigli su misura.</div>
        )}
        <div className="grid g4">
          <div className="card kpi"><div className="lbl">Entrate del mese</div><div className="val">{eur(cur.entrate)}</div><div className="cmp">{delta(cur.entrate, prev.entrate)}</div></div>
          <div className="card kpi"><div className="lbl">Spese del mese</div><div className="val">{eur(cur.spese)}</div><div className="cmp">{delta(cur.spese, prev.spese)}</div></div>
          <div className="card kpi"><div className="lbl">Margine</div><div className={`val ${cur.margine < 0 ? 'down' : ''}`}>{eur(cur.margine)}</div><div className="cmp">{cur.entrate ? `${((cur.margine / cur.entrate) * 100).toFixed(0)}% delle entrate` : '—'}</div></div>
          <div className="card kpi"><div className="lbl">Follower Instagram</div><div className="val">{sn.length ? num(sn[sn.length - 1].followers) : '—'}</div>
            <div className="cmp">{growth ? <span className={growth.delta >= 0 ? 'up' : 'down'}>{growth.delta >= 0 ? '+' : ''}{growth.delta} ({growth.perWeek.toFixed(1)}/sett.)</span> : <Link href="/social">Aggiungi una rilevazione</Link>}</div></div>
        </div>

        <div className="grid g2" style={{ marginTop: 14 }}>
          <div className="card pad">
            <h3>Andamento ultimi 6 mesi</h3>
            {months.length ? <MoneyBars data={months} /> : <p className="muted">Registra entrate e spese nel <Link href="/gestionale">gestionale</Link> per vedere il grafico.</p>}
          </div>
          <div className="card pad">
            <h3>Questa settimana con Luce</h3>
            {actions.length ? (
              <ul className="list-gap" style={{ listStyle: 'none', padding: 0 }}>
                {actions.map((a, i) => <li key={i} className={a.fatto ? 'muted' : ''}>{a.fatto ? '✓' : '○'} {a.titolo}</li>)}
              </ul>
            ) : <p className="muted">Nessun piano ancora. <Link href="/co-conduzione">Genera il piano della settimana</Link>.</p>}
          </div>
        </div>

        <div className="grid g3" style={{ marginTop: 14 }}>
          <div className="card kpi"><div className="lbl">Clienti attivi</div><div className="val">{activeClients ?? 0}</div><div className="cmp"><Link href="/clienti">Vai ai clienti</Link></div></div>
          <div className="card pad">
            <h3>Prossime sedute</h3>
            {appts?.length ? appts.map((a) => (
              <div key={a.id} className="row-between small" style={{ padding: '4px 0' }}>
                <Link href={`/clienti/${a.client_id}`}><b>{(a.clients as unknown as { full_name: string } | null)?.full_name}</b> · {a.service}</Link>
                <span className="muted">{dateTimeIt(a.starts_at)}</span>
              </div>
            )) : <p className="muted small">Nessuna seduta in calendario.</p>}
          </div>
          <div className="card pad">
            <h3>Contenuti in arrivo</h3>
            {upcoming?.length ? upcoming.map((c) => (
              <div key={c.id} className="row-between small" style={{ padding: '4px 0' }}>
                <span><span className="pill sage">{c.format}</span> {c.title}</span>
                <span className="muted">{c.planned_for ? dateIt(c.planned_for) : ''}</span>
              </div>
            )) : <p className="muted small">Nessun contenuto pianificato. <Link href="/contenuti">Crea il piano</Link>.</p>}
          </div>
        </div>
      </div>
    </>
  );
}
