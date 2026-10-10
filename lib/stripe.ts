import Stripe from 'stripe';

export function stripeConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY mancante');
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

export const appUrl = () => process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
