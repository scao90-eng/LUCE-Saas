-- ============================================================
-- 002 · Analisi profilo da link/screenshot + caroselli scaricabili
-- Eseguire dopo schema.sql (è rieseguibile).
-- ============================================================

-- Identità visiva per le slide
alter table public.profiles add column if not exists brand_color text default '#B8643F';
alter table public.profiles add column if not exists carousel_design text default 'crema';

-- Post importati da Instagram: id esterno per non duplicarli, follower al momento
-- dell'import (base dell'engagement quando la copertura non è disponibile).
alter table public.social_posts add column if not exists external_id text;
alter table public.social_posts add column if not exists followers_base integer;
create unique index if not exists social_posts_external_idx on public.social_posts(owner_id, external_id);

-- Slide dei caroselli
alter table public.content_items add column if not exists slides jsonb;
alter table public.content_items add column if not exists design text;

-- Nuovi tipi di generazione AI
alter table public.ai_generations drop constraint if exists ai_generations_kind_check;
alter table public.ai_generations add constraint ai_generations_kind_check
  check (kind in ('coaching','contenuti','reel','analisi','carosello'));

-- Analisi del profilo (proprio o di riferimento)
create table if not exists public.profile_audits (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  username text,
  is_own boolean not null default true,
  source text not null check (source in ('link','screenshot')),
  stats jsonb not null default '{}'::jsonb,   -- numeri pubblici calcolati
  audit jsonb not null,                        -- valutazione AI
  created_at timestamptz not null default now()
);
create index if not exists profile_audits_owner_idx on public.profile_audits(owner_id, created_at desc);
alter table public.profile_audits enable row level security;
drop policy if exists "dati: propri" on public.profile_audits;
create policy "dati: propri" on public.profile_audits for all
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
