# Luce · SaaS per il mondo olistico

Gestionale + social per operatori olistici (yoga, reiki, naturopatia, meditazione, danza, massaggio…),
venduto in abbonamento. Progetto **indipendente**: repo, database Supabase e progetto Vercel propri,
nessun legame con RETI CRM.

## I pilastri
| Sezione | Cosa fa |
|---|---|
| **Panoramica** | Entrate, spese, margine del mese vs mese scorso, follower, prossime sedute, azioni della settimana, contenuti in arrivo |
| **Entrate e spese** | Movimenti per mese, categorie tipiche del settore, grafico 12 mesi, da dove arrivano i guadagni e dove vanno le spese |
| **Clienti** | Schede clienti (stato, provenienza, note), storico sedute, totale speso; una seduta "svolta" registra in automatico l'incasso |
| **Analisi profilo** | Rilevazioni periodiche Instagram + performance dei contenuti: crescita, engagement per formato, giorno migliore, conversione visite → clic |
| **Co-conduzione** | Claude legge numeri dell'attività e del profilo e propone 3–5 azioni settimanali (perché, come, cosa misurare), da spuntare |
| **Piano contenuti** | Piano editoriale settimanale generato sui dati: formato, pilastro, hook, didascalia, hashtag, data |
| **Studio reel** | Script scena per scena (inquadratura, testo a schermo, voce), audio, consigli di ripresa, caption |
| **Abbonamento** | Prova gratuita 14 giorni, piani Base/Pro su Stripe, portale per fatture e disdetta, limite mensile generazioni AI |

## Stack
- **Next.js 14** (app router, server actions) su **Vercel**
- **Supabase**: Postgres + Auth + RLS (ogni operatore vede solo i propri dati)
- **Claude API** (`@anthropic-ai/sdk`) per co-conduzione, contenuti e reel, con output JSON strutturato
- **Stripe** per gli abbonamenti (Checkout + Customer Portal + webhook)

## Setup
1. **Supabase**: crea un progetto NUOVO (regione EU). Dal SQL Editor esegui `supabase/schema.sql`
   (è rieseguibile). Authentication → URL configuration: imposta il Site URL dell'app.
2. **Variabili**: copia `.env.example` in `.env.local` e compila Supabase (URL, publishable key,
   service role key), `ANTHROPIC_API_KEY`, Stripe e `NEXT_PUBLIC_APP_URL`.
3. **Stripe**: crea due prodotti con prezzo ricorrente mensile (Base, Pro) e metti gli ID prezzo in
   `STRIPE_PRICE_BASE` / `STRIPE_PRICE_PRO`. Crea un webhook verso `/api/stripe/webhook` con gli eventi
   `checkout.session.completed`, `customer.subscription.created`, `.updated`, `.deleted` e copia il
   signing secret in `STRIPE_WEBHOOK_SECRET`. Attiva il Customer Portal.
4. `npm install && npm run dev` → http://localhost:3000/registrati
5. **Vercel**: importa il repo, aggiungi le stesse variabili d'ambiente, deploy.

## Prezzi e limiti
Definiti in `lib/plans.ts` (etichette, funzioni, generazioni AI al mese per piano). Gli importi
reali sono quelli dei prezzi Stripe.

## Roadmap
1. **Fatto · MVP**: tutti i pilastri in versione base, abbonamenti, prova gratuita.
2. Collegamento Instagram/Facebook via Meta Graph API (import automatico di insight e post;
   richiede app Meta e revisione delle autorizzazioni `instagram_business_*`).
3. Calendario sedute settimanale, pacchetti/abbonamenti dei clienti con sedute residue, promemoria WhatsApp/email.
4. Generazione grafiche per caroselli e copertine reel (template brandizzati), esportazione PDF del report mensile.
5. Montaggio reel assistito (sottotitoli automatici sui video caricati).
