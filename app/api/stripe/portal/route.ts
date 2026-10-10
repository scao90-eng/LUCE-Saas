import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { getStripe, stripeConfigured, appUrl } from '@/lib/stripe';

// Portale clienti Stripe: cambio piano, carta, fatture, disdetta.
export async function POST(request: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.redirect(new URL('/login', request.url), 303);
  const customer = s.subscription?.stripe_customer_id;
  if (!stripeConfigured() || !customer) {
    return NextResponse.redirect(new URL('/abbonamento?error=' + encodeURIComponent('Nessun abbonamento da gestire.'), request.url), 303);
  }
  const portal = await getStripe().billingPortal.sessions.create({ customer, return_url: `${appUrl()}/abbonamento` });
  return NextResponse.redirect(portal.url, 303);
}
