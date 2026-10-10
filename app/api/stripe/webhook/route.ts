import { NextResponse, type NextRequest } from 'next/server';
import type Stripe from 'stripe';
import { getStripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';

// Webhook Stripe → aggiorna la tabella subscriptions (con service role).
// Eventi da abilitare su Stripe: checkout.session.completed,
// customer.subscription.created / updated / deleted.
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const admin = createAdminClient();
  if (!secret || !admin) return NextResponse.json({ error: 'non configurato' }, { status: 500 });

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), request.headers.get('stripe-signature') ?? '', secret);
  } catch {
    return NextResponse.json({ error: 'firma non valida' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const s = event.data.object as Stripe.Checkout.Session;
    const userId = s.client_reference_id ?? s.metadata?.user_id;
    if (userId && typeof s.customer === 'string') {
      await admin.from('subscriptions').update({ stripe_customer_id: s.customer, updated_at: new Date().toISOString() }).eq('user_id', userId);
    }
  }

  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as Stripe.Subscription;
    const userId = sub.metadata?.user_id;
    const plan = sub.metadata?.plan === 'pro' ? 'pro' : 'base';
    const status = event.type === 'customer.subscription.deleted' ? 'canceled'
      : sub.status === 'active' || sub.status === 'trialing' ? 'active' : sub.status;
    const periodEnd = sub.items.data[0]?.current_period_end;
    const patch = {
      plan, status,
      stripe_subscription_id: sub.id,
      stripe_customer_id: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (userId) await admin.from('subscriptions').update(patch).eq('user_id', userId);
    else await admin.from('subscriptions').update(patch).eq('stripe_customer_id', patch.stripe_customer_id);
  }

  return NextResponse.json({ received: true });
}
