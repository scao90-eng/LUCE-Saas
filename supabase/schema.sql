-- ============================================================
-- LUCE · SaaS olistico — schema completo (applicare dal SQL Editor)
-- Progetto Supabase DEDICATO: non condivide nulla con RETI CRM.
-- Ogni operatore vede solo i propri dati (RLS su owner_id = auth.uid()).
-- ============================================================
create extension if not exists pgcrypto;

-- ---------- PROFILO OPERATORE ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  business_name text,
  discipline text,          -- es. yoga, reiki, naturopatia, danza, meditazione
  city text,
  target text,              -- a chi si rivolge
  tone text,                -- tono di voce desiderato
  instagram_handle text,
  created_at timestamptz not null default now()
);

-- ---------- ABBONAMENTO (scritto solo dal webhook Stripe / service role) ----------
create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'trial' check (plan in ('trial','base','pro')),
  status text not null default 'trialing',  -- trialing | active | past_due | canceled
  trial_ends_at timestamptz not null default (now() + interval '14 days'),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

-- ---------- CLIENTI ----------
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  birth_date date,
  source text,              -- instagram, passaparola, evento...
  status text not null default 'attivo' check (status in ('lead','attivo','inattivo')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists clients_owner_idx on public.clients(owner_id);

-- ---------- SEDUTE / APPUNTAMENTI ----------
create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  starts_at timestamptz not null,
  service text not null,
  price numeric(10,2) not null default 0 check (price >= 0),
  status text not null default 'prenotato' check (status in ('prenotato','svolto','annullato')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists appointments_owner_idx on public.appointments(owner_id, starts_at);

-- ---------- ENTRATE / SPESE ----------
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('entrata','spesa')),
  amount numeric(10,2) not null check (amount > 0),
  category text not null,
  description text,
  occurred_on date not null default current_date,
  client_id uuid references public.clients(id) on delete set null,
  method text,              -- contanti, carta, bonifico...
  created_at timestamptz not null default now()
);
create index if not exists transactions_owner_idx on public.transactions(owner_id, occurred_on);

-- ---------- SOCIAL: rilevazioni periodiche del profilo ----------
create table if not exists public.social_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  platform text not null default 'instagram' check (platform in ('instagram','facebook','tiktok')),
  taken_on date not null default current_date,
  followers integer not null check (followers >= 0),
  reach integer,
  profile_visits integer,
  link_clicks integer,
  created_at timestamptz not null default now(),
  unique (owner_id, platform, taken_on)
);

-- ---------- SOCIAL: performance dei singoli contenuti ----------
create table if not exists public.social_posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  platform text not null default 'instagram' check (platform in ('instagram','facebook','tiktok')),
  published_on date not null,
  format text not null check (format in ('reel','carosello','post','storia')),
  topic text,
  reach integer not null default 0,
  likes integer not null default 0,
  comments integer not null default 0,
  saves integer not null default 0,
  shares integer not null default 0,
  url text,
  created_at timestamptz not null default now()
);
create index if not exists social_posts_owner_idx on public.social_posts(owner_id, published_on);

-- ---------- CO-CONDUZIONE: piani settimanali generati dall'AI ----------
create table if not exists public.coaching_plans (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  week_start date not null,
  summary text not null,
  actions jsonb not null default '[]'::jsonb,   -- [{titolo, perche, come, metrica, fatto}]
  created_at timestamptz not null default now()
);

-- ---------- CONTENUTI (piano editoriale + script reel) ----------
create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  format text not null check (format in ('reel','carosello','post','storia')),
  title text not null,
  pillar text,              -- educazione, ispirazione, dietro le quinte, offerta...
  hook text,
  caption text,
  script jsonb,             -- per i reel: {scene:[{secondi, visivo, testo_schermo, voce}], audio, cta}
  hashtags text,
  planned_for date,
  status text not null default 'idea' check (status in ('idea','pronto','pubblicato')),
  source text not null default 'ai' check (source in ('ai','manuale')),
  created_at timestamptz not null default now()
);
create index if not exists content_items_owner_idx on public.content_items(owner_id, planned_for);

-- ============================================================
-- Profilo + prova gratuita creati automaticamente alla registrazione
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, business_name)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'business_name')
  on conflict (id) do nothing;
  insert into public.subscriptions (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- RLS
-- ============================================================
alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.clients enable row level security;
alter table public.appointments enable row level security;
alter table public.transactions enable row level security;
alter table public.social_snapshots enable row level security;
alter table public.social_posts enable row level security;
alter table public.coaching_plans enable row level security;
alter table public.content_items enable row level security;

drop policy if exists "profilo: proprio" on public.profiles;
create policy "profilo: proprio" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- L'abbonamento si legge ma non si modifica dal browser (lo aggiorna il webhook Stripe).
drop policy if exists "abbonamento: lettura" on public.subscriptions;
create policy "abbonamento: lettura" on public.subscriptions
  for select using (user_id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['clients','appointments','transactions','social_snapshots',
                           'social_posts','coaching_plans','content_items'] loop
    execute format('drop policy if exists "dati: propri" on public.%I', t);
    execute format('create policy "dati: propri" on public.%I for all
                    using (owner_id = auth.uid()) with check (owner_id = auth.uid())', t);
  end loop;
end $$;

-- ---------- Registro generazioni AI (per i limiti mensili del piano) ----------
create table if not exists public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('coaching','contenuti','reel')),
  created_at timestamptz not null default now()
);
create index if not exists ai_generations_owner_idx on public.ai_generations(owner_id, created_at);
alter table public.ai_generations enable row level security;
drop policy if exists "ai: lettura" on public.ai_generations;
create policy "ai: lettura" on public.ai_generations for select using (owner_id = auth.uid());
drop policy if exists "ai: inserimento" on public.ai_generations;
create policy "ai: inserimento" on public.ai_generations for insert with check (owner_id = auth.uid());
