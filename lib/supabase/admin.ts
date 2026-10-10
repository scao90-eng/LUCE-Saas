import { createClient } from '@supabase/supabase-js';

// Client con service_role: SOLO lato server (server action). La service_role key
// bypassa la RLS e non deve MAI arrivare al browser. Serve per creare account
// utente (auth.admin) durante l'invito dei clienti.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
