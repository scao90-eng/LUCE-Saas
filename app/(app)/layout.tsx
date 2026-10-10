export const dynamic = 'force-dynamic';

import { requireSession } from '@/lib/session';
import Sidebar from '@/components/Sidebar';
import { themeCss } from '@/lib/theme';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile, user, subscription } = await requireSession();

  let trialNote: string | null = null;
  if (subscription && subscription.status !== 'active') {
    const days = Math.ceil((Date.parse(subscription.trial_ends_at) - Date.now()) / 86_400_000);
    trialNote = subscription.status === 'trialing' && days > 0
      ? `Prova gratuita: ${days} ${days === 1 ? 'giorno' : 'giorni'}`
      : 'Abbonamento non attivo';
  }

  return (
    <div className="app">
      {/* Colori scelti dall'operatore (Profilo attività → Aspetto) */}
      <style>{themeCss(profile.brand_color, profile.sidebar_color)}</style>
      <Sidebar name={profile.full_name ?? user.email ?? ''} business={profile.business_name ?? ''} logoUrl={profile.logo_url ?? null} trialNote={trialNote} />
      <div className="main">{children}</div>
    </div>
  );
}
