'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from '@/lib/actions';

const NAV: { sec: string; items: { href: string; label: string; ico: string }[] }[] = [
  { sec: 'Attività', items: [
    { href: '/dashboard', label: 'Panoramica', ico: '◐' },
    { href: '/gestionale', label: 'Entrate e spese', ico: '€' },
    { href: '/clienti', label: 'Clienti', ico: '☺' },
  ] },
  { sec: 'Social', items: [
    { href: '/social', label: 'Analisi profilo', ico: '◎' },
    { href: '/co-conduzione', label: 'Co-conduzione', ico: '✦' },
    { href: '/contenuti', label: 'Piano contenuti', ico: '❖' },
    { href: '/caroselli', label: 'Caroselli', ico: '▦' },
    { href: '/reel', label: 'Studio reel', ico: '▶' },
  ] },
  { sec: 'Account', items: [
    { href: '/impostazioni', label: 'Profilo attività', ico: '⚙' },
    { href: '/abbonamento', label: 'Abbonamento', ico: '◇' },
  ] },
];

export default function Sidebar({ name, business, trialNote }: { name: string; business: string; trialNote: string | null }) {
  const pathname = usePathname();
  const initials = name.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase() || 'L';
  return (
    <aside className="side">
      <div className="side-brand">
        <div className="mark">L</div>
        <div><b>Luce</b><span>{business || 'il tuo spazio olistico'}</span></div>
      </div>
      <nav aria-label="Navigazione principale">
        {NAV.map((g) => (
          <div key={g.sec}>
            <div className="side-sec">{g.sec}</div>
            {g.items.map((i) => (
              <Link key={i.href} href={i.href} className={`side-item${pathname.startsWith(i.href) ? ' on' : ''}`}>
                <span className="ico" aria-hidden>{i.ico}</span>{i.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      {trialNote && (
        <div className="side-trial">{trialNote} · <Link href="/abbonamento">Scegli un piano</Link></div>
      )}
      <div className="side-foot">
        <div className="avatar">{initials}</div>
        <div className="side-foot-id"><b>{name || 'Operatore'}</b><small>{business || '—'}</small></div>
        <form action={signOut}><button className="side-out" type="submit">Esci</button></form>
      </div>
    </aside>
  );
}
