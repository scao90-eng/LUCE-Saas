import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { SUPABASE_URL, SUPABASE_KEY } from './env';

// Client Supabase per Server Components / Route Handlers / Server Actions.
// Legge e (dove consentito) scrive i cookie di sessione.
export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    SUPABASE_URL,
    SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll chiamato da un Server Component: ignorabile perché il
            // refresh della sessione è gestito dal middleware.
          }
        },
      },
    }
  );
}
