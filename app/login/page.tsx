import type { Metadata } from 'next';
import Link from 'next/link';
import { signIn } from '@/lib/actions';

export const metadata: Metadata = { title: 'Accedi · Luce' };

const ERRORS: Record<string, string> = {
  credentials: 'Email o password non corretti.',
  missing: 'Inserisci email e password.',
  config: 'Supabase non è ancora configurato: aggiungi URL e chiave in .env.local.',
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string; next?: string; ok?: string } }) {
  const error = searchParams.error ? ERRORS[searchParams.error] ?? 'Accesso non riuscito.' : null;
  return (
    <main className="auth">
      <form className="auth-card" action={signIn}>
        <div className="auth-brand">
          <div className="mark">L</div>
          <div><b>Luce</b><span>per il mondo olistico</span></div>
        </div>
        <h1 className="auth-title">Bentornata, bentornato</h1>
        <p className="auth-sub">Accedi per gestire attività, clienti e profilo social.</p>
        {searchParams.ok === 'confirm' && (
          <div className="banner ok">Account creato: conferma l&apos;email che ti abbiamo inviato, poi accedi.</div>
        )}
        {error && <div className="banner err" role="alert">{error}</div>}
        <input type="hidden" name="next" value={searchParams.next ?? '/dashboard'} />
        <label className="fld" htmlFor="email">Email</label>
        <input className="fin" id="email" name="email" type="email" autoComplete="email" required />
        <label className="fld" htmlFor="password">Password</label>
        <input className="fin" id="password" name="password" type="password" autoComplete="current-password" required />
        <button className="btn pri auth-submit" type="submit">Accedi</button>
        <p className="auth-foot">Non hai un account? <Link href="/registrati">Prova gratis 14 giorni</Link></p>
      </form>
    </main>
  );
}
