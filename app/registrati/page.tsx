import type { Metadata } from 'next';
import Link from 'next/link';
import { signUp } from '@/lib/actions';

export const metadata: Metadata = { title: 'Registrati · Luce' };

const ERRORS: Record<string, string> = {
  password: 'Inserisci un\'email valida e una password di almeno 8 caratteri.',
  signup: 'Registrazione non riuscita: l\'email potrebbe essere già in uso.',
  config: 'Supabase non è ancora configurato.',
};

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  const error = searchParams.error ? ERRORS[searchParams.error] ?? 'Registrazione non riuscita.' : null;
  return (
    <main className="auth">
      <form className="auth-card" action={signUp}>
        <div className="auth-brand">
          <div className="mark">L</div>
          <div><b>Luce</b><span>per il mondo olistico</span></div>
        </div>
        <h1 className="auth-title">Inizia la prova gratuita</h1>
        <p className="auth-sub">14 giorni con tutte le funzioni. Nessuna carta richiesta.</p>
        {error && <div className="banner err" role="alert">{error}</div>}
        <label className="fld" htmlFor="full_name">Nome e cognome</label>
        <input className="fin" id="full_name" name="full_name" autoComplete="name" required />
        <label className="fld" htmlFor="business_name">Nome dell&apos;attività</label>
        <input className="fin" id="business_name" name="business_name" placeholder="es. Studio Respiro" />
        <label className="fld" htmlFor="email">Email</label>
        <input className="fin" id="email" name="email" type="email" autoComplete="email" required />
        <label className="fld" htmlFor="password">Password</label>
        <input className="fin" id="password" name="password" type="password" minLength={8} autoComplete="new-password" required />
        <button className="btn pri auth-submit" type="submit">Crea account</button>
        <p className="auth-foot">Hai già un account? <Link href="/login">Accedi</Link></p>
      </form>
    </main>
  );
}
