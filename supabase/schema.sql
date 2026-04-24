-- =============================================================================
-- Sorrento Chores — Schema Supabase
-- -----------------------------------------------------------------------------
-- Esegui questo file nel SQL Editor di Supabase (Dashboard -> SQL -> New query)
-- dopo aver creato il progetto. Crea tutte le tabelle, abilita RLS con policy
-- permissive per il ruolo `anon` (l'app non usa autenticazione), fa il seed dei
-- tipi di faccenda di default, e attiva Realtime per le tabelle live.
--
-- NOTA DI DESIGN: `profiles.id` NON referenzia auth.users perché l'app usa solo
-- la chiave anonima senza login. I profili sono righe autonome identificate da
-- un UUID generato lato server.
-- =============================================================================

-- Estensione per gen_random_uuid()
create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tabella: profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key default gen_random_uuid(),
  display_name text not null,
  avatar_url   text,
  color        text not null default '#f97316',
  created_at   timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- Tabella: chore_types
-- -----------------------------------------------------------------------------
create table if not exists public.chore_types (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

-- Seed dei tipi di faccenda di default (idempotente grazie a ON CONFLICT)
insert into public.chore_types (name) values
  ('Pavimenti'),
  ('Cucina'),
  ('Bagno')
on conflict (name) do nothing;

-- -----------------------------------------------------------------------------
-- Tabella: chore_logs
-- -----------------------------------------------------------------------------
create table if not exists public.chore_logs (
  id            uuid primary key default gen_random_uuid(),
  profile_id    uuid references public.profiles(id) on delete cascade,
  chore_type_id uuid references public.chore_types(id) on delete set null,
  chore_name    text not null,
  done_at       timestamptz not null default now(),
  notes         text
);

create index if not exists chore_logs_done_at_idx on public.chore_logs (done_at desc);
create index if not exists chore_logs_profile_id_idx on public.chore_logs (profile_id);
create index if not exists chore_logs_chore_type_id_idx on public.chore_logs (chore_type_id);

-- -----------------------------------------------------------------------------
-- Tabella: shopping_items
-- -----------------------------------------------------------------------------
create table if not exists public.shopping_items (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  done       boolean not null default false,
  added_by   uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_created_at_idx on public.shopping_items (created_at desc);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
-- Abilitiamo RLS e poi aggiungiamo policy che permettono TUTTO al ruolo `anon`.
-- Questo è intenzionale: l'app non ha autenticazione e tutti i client usano
-- la anon key. Se un domani volessi limitare l'accesso (es. reintrodurre auth)
-- basterà sostituire queste policy con altre più restrittive.
-- =============================================================================

alter table public.profiles        enable row level security;
alter table public.chore_types     enable row level security;
alter table public.chore_logs      enable row level security;
alter table public.shopping_items  enable row level security;

-- profiles
drop policy if exists "anon all profiles" on public.profiles;
create policy "anon all profiles" on public.profiles
  for all to anon using (true) with check (true);

-- chore_types
drop policy if exists "anon all chore_types" on public.chore_types;
create policy "anon all chore_types" on public.chore_types
  for all to anon using (true) with check (true);

-- chore_logs
drop policy if exists "anon all chore_logs" on public.chore_logs;
create policy "anon all chore_logs" on public.chore_logs
  for all to anon using (true) with check (true);

-- shopping_items
drop policy if exists "anon all shopping_items" on public.shopping_items;
create policy "anon all shopping_items" on public.shopping_items
  for all to anon using (true) with check (true);

-- =============================================================================
-- REALTIME
-- =============================================================================
-- Aggiungiamo chore_logs e shopping_items alla publication `supabase_realtime`.
-- In questo modo i client ricevono gli eventi INSERT/UPDATE/DELETE in tempo reale.
-- =============================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chore_logs'
  ) then
    execute 'alter publication supabase_realtime add table public.chore_logs';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_items'
  ) then
    execute 'alter publication supabase_realtime add table public.shopping_items';
  end if;
end $$;

-- =============================================================================
-- STORAGE POLICIES (bucket: avatars)
-- =============================================================================
-- Il bucket `avatars` va creato manualmente da Dashboard -> Storage -> New bucket
-- (nome: `avatars`, public: true). Queste policy permettono al ruolo `anon` di
-- caricare, aggiornare e cancellare file al suo interno.
-- =============================================================================

drop policy if exists "anon read avatars"   on storage.objects;
drop policy if exists "anon insert avatars" on storage.objects;
drop policy if exists "anon update avatars" on storage.objects;
drop policy if exists "anon delete avatars" on storage.objects;

create policy "anon read avatars" on storage.objects
  for select to anon using (bucket_id = 'avatars');

create policy "anon insert avatars" on storage.objects
  for insert to anon with check (bucket_id = 'avatars');

create policy "anon update avatars" on storage.objects
  for update to anon using (bucket_id = 'avatars') with check (bucket_id = 'avatars');

create policy "anon delete avatars" on storage.objects
  for delete to anon using (bucket_id = 'avatars');
