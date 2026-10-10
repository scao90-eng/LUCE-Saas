import { NextResponse, type NextRequest } from 'next/server';
import { getSession } from '@/lib/session';
import { getStripe, stripeConfigured, appUrl } from '@/lib/stripe';
import { PLANS } from '@/lib/plans';

// POST dal form della pagina Abbonamento → reindirizza al checkout Stripe.
export async function POST(request: NextRequest) {
  const s = await getSession();
  if (!s) return NextResponse.redirect(new URL('/login', request.url), 303);
  const back = (msg: string) => NextResponse.redirect(new URL(`/abbonamento?error=${encodeURIComponent(msg)}`, request.url), 303);
  if (!stripeConfigured()) return back('Pagamenti non ancora configurati.');

  const form = await request.formData();
  const planId = String(form.get('plan')) as keyof typeof PLANS;
  const plan = PLANS[planId];
  const price = plan && process.env[plan.priceEnv];
  if (!price) return back('Piano non disponibile.');

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price, quantity: 1 }],
    customer: s.subscription?.stripe_customer_id ?? undefined,
    customer_email: s.subscription?.stripe_customer_id ? undefined : s.user.email,
    client_reference_id: s.user.id,
    metadata: { user_id: s.user.id, plan: planId },
    subscription_data: { metadata: { user_id: s.user.id, plan: planId } },
    allow_promotion_codes: true,
    success_url: `${appUrl()}/abbonamento?ok=${encodeURIComponent('Abbonamento attivato, grazie!')}`,
    cancel_url: `${appUrl()}/abbonamento`,
  });
  return NextResponse.redirect(session.url!, 303);
}
