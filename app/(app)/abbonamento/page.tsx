import PageHeader from '@/components/PageHeader';
import Flash from '@/components/Flash';
import { requireSession, subscriptionActive } from '@/lib/session';
import { PLANS, AI_MONTHLY_LIMIT } from '@/lib/plans';
import { dateIt, monthStart } from '@/lib/format';

export default async function Abbonamento({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const { supabase, subscription: sub } = await requireSession();
  const { count: used } = await supabase.from('ai_generations').select('id', { count: 'exact', head: true }).gte('created_at', monthStart());
  const plan = sub?.plan ?? 'trial';
  const limit = AI_MONTHLY_LIMIT[plan];
  const active = subscriptionActive(sub);

  let state = 'Nessun abbonamento';
  if (sub?.status === 'active') state = `Piano ${PLANS[plan as 'base' | 'pro']?.name ?? plan} attivo${sub.current_period_end ? ` · rinnovo il ${dateIt(sub.current_period_end)}` : ''}`;
  else if (sub?.status === 'trialing') state = active ? `Prova gratuita fino al ${dateIt(sub.trial_ends_at)}` : 'Prova gratuita terminata';
  else if (sub) state = `Abbonamento ${sub.status}`;

  return (
    <>
      <PageHeader title="Abbonamento" sub={state} />
      <div className="wrap">
        <Flash searchParams={searchParams} />
        <div className="card kpi" style={{ maxWidth: 360 }}>
          <div className="lbl">Generazioni AI questo mese</div>
          <div className="val">{used ?? 0}{limit !== null ? <span className="muted small"> / {limit}</span> : ''}</div>
        </div>
        <div className="grid g2" style={{ marginTop: 14, maxWidth: 820 }}>
          {(Object.keys(PLANS) as (keyof typeof PLANS)[]).map((id) => {
            const p = PLANS[id];
            const current = sub?.status === 'active' && plan === id;
            return (
              <div key={id} className={`card plan${current ? ' cur' : ''}`}>
                <h3>{p.name}</h3>
                <div className="price">{p.price}</div>
                <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                {current ? <span className="pill ok">Il tuo piano</span> : sub?.status !== 'active' && (
                  <form action="/api/stripe/checkout" method="post">
                    <input type="hidden" name="plan" value={id} />
                    <button className="btn pri" type="submit" style={{ width: '100%' }}>Scegli {p.name}</button>
                  </form>
                )}
              </div>
            );
          })}
        </div>
        {sub?.stripe_customer_id && (
          <form action="/api/stripe/portal" method="post" style={{ marginTop: 16 }}>
            <button className="btn" type="submit">Gestisci pagamento, fatture e disdetta</button>
          </form>
        )}
      </div>
    </>
  );
}
