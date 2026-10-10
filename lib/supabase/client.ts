import { createBrowserClient } from '@supabase/ssr';
import { SUPABASE_URL, SUPABASE_KEY } from './env';

// Client Supabase per i componenti eseguiti nel browser ("use client").
export function createClient() {
  return createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
}
