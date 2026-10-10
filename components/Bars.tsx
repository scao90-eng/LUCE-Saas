import { eur, monthLabel } from '@/lib/format';

// Istogramma entrate (salvia) / spese (terracotta) per mese.
export function MoneyBars({ data }: { data: { month: string; entrate: number; spese: number }[] }) {
  const max = Math.max(1, ...data.flatMap((d) => [d.entrate, d.spese]));
  return (
    <>
      <div className="bars" role="img" aria-label="Entrate e spese per mese">
        {data.map((d) => (
          <div className="bar-col" key={d.month}>
            <div className="bar-pair">
              <div className="bar in" style={{ height: `${(d.entrate / max) * 100}%` }} title={`Entrate ${eur(d.entrate)}`} />
              <div className="bar out" style={{ height: `${(d.spese / max) * 100}%` }} title={`Spese ${eur(d.spese)}`} />
            </div>
            <div className="bar-lbl">{monthLabel(d.month)}</div>
          </div>
        ))}
      </div>
      <div className="legend"><span><i style={{ background: 'var(--sage)' }} />Entrate</span><span><i style={{ background: 'var(--accent)' }} />Spese</span></div>
    </>
  );
}

export function SimpleBars({ data }: { data: { label: string; value: number; title: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="bars" role="img" aria-label="Andamento">
      {data.map((d, i) => (
        <div className="bar-col" key={i}>
          <div className="bar-pair"><div className="bar one" style={{ height: `${(d.value / max) * 100}%` }} title={d.title} /></div>
          <div className="bar-lbl">{d.label}</div>
        </div>
      ))}
    </div>
  );
}
