// Piani di abbonamento. I prezzi reali vivono su Stripe (STRIPE_PRICE_*);
// qui ci sono etichette e funzionalità mostrate nella pagina Abbonamento.
export type PlanId = 'trial' | 'base' | 'pro';

export const PLANS: Record<Exclude<PlanId, 'trial'>, {
  name: string; price: string; priceEnv: string; features: string[];
}> = {
  base: {
    name: 'Base',
    price: '19 €/mese',
    priceEnv: 'STRIPE_PRICE_BASE',
    features: ['Gestionale entrate e spese', 'Schede clienti e sedute', 'Analisi social', '10 generazioni AI al mese'],
  },
  pro: {
    name: 'Pro',
    price: '49 €/mese',
    priceEnv: 'STRIPE_PRICE_PRO',
    features: ['Tutto il piano Base', 'Co-conduzione settimanale', 'Piano editoriale e script reel illimitati', 'Supporto prioritario'],
  },
};

// Quante generazioni AI al mese consente ogni piano (null = illimitate).
export const AI_MONTHLY_LIMIT: Record<PlanId, number | null> = { trial: 15, base: 10, pro: null };
