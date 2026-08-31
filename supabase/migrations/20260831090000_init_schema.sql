-- ===========================================================================
-- DEL Herren Friseur Barber Shop
-- Migration 001 : schema de base
--
-- Principes :
--  - les reservations referencent de vraies cles etrangeres (services,
--    barbers), pas des chaines de caracteres dupliquees
--  - le double booking est rendu IMPOSSIBLE en base par une contrainte
--    d'exclusion, pas seulement par une verification cote client
--  - reservation invite : pas de compte client obligatoire en phase 1,
--    la colonne user_id existe deja pour la phase 2
-- ===========================================================================

create extension if not exists "pgcrypto";
create extension if not exists "btree_gist";

-- ---------------------------------------------------------------- helpers --

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ------------------------------------------------------------ admin_users --

create table if not exists public.admin_users (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Liste des comptes autorises a acceder au dashboard. Table dediee plutot
   qu''une colonne sur profiles : le role n''est jamais modifiable par le client.';

-- SECURITY DEFINER pour eviter la recursion RLS quand une policy interroge
-- cette table depuis une autre table.
create or replace function public.is_admin(_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users a where a.user_id = _user_id);
$$;

-- --------------------------------------------------------------- services --

create table if not exists public.services (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique,
  name_de       text not null,
  name_en       text not null default '',
  name_tr       text not null default '',
  duration_min  integer not null check (duration_min between 5 and 480),
  price         numeric(6,2) not null check (price >= 0),
  is_from_price boolean not null default false,
  category      text not null default 'hair'
                check (category in ('hair','beard','shave','extra')),
  sort_order    integer not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create trigger services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------- barbers --

create table if not exists public.barbers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  initials   text not null default '',
  role_de    text not null default '',
  role_en    text not null default '',
  role_tr    text not null default '',
  image_url  text,
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger barbers_updated_at
  before update on public.barbers
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------- opening_hours --

-- weekday suit getDay() cote JS : 0 = dimanche ... 6 = samedi
create table if not exists public.opening_hours (
  weekday    smallint primary key check (weekday between 0 and 6),
  is_open    boolean not null default true,
  open_time  time not null default '09:00',
  close_time time not null default '19:00',
  updated_at timestamptz not null default now(),
  constraint opening_hours_order check (close_time > open_time)
);

create trigger opening_hours_updated_at
  before update on public.opening_hours
  for each row execute function public.set_updated_at();

-- --------------------------------------------------------------- settings --

create table if not exists public.settings (
  id                   integer primary key default 1 check (id = 1),
  slot_granularity_min integer not null default 15 check (slot_granularity_min between 5 and 60),
  min_lead_time_min    integer not null default 60 check (min_lead_time_min >= 0),
  max_advance_days     integer not null default 60 check (max_advance_days between 1 and 365),
  buffer_after_min     integer not null default 0 check (buffer_after_min >= 0),
  auto_confirm         boolean not null default true,
  updated_at           timestamptz not null default now()
);

create trigger settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------- blocked_slots --

create table if not exists public.blocked_slots (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid references public.barbers(id) on delete cascade, -- null = tout le salon
  date       date not null,
  start_time time not null default '00:00',
  end_time   time not null default '23:59',
  all_day    boolean not null default false,
  reason     text not null default '',
  created_at timestamptz not null default now(),
  constraint blocked_slots_order check (end_time > start_time)
);

create index if not exists blocked_slots_date_idx on public.blocked_slots (date);

comment on table public.blocked_slots is
  'Conges, jours de fermeture exceptionnels et blocages manuels de creneaux.
   barber_id null vaut pour le salon entier.';

-- --------------------------------------------------------------- bookings --

create type public.booking_status as enum
  ('pending','confirmed','done','no_show','cancelled');

create table if not exists public.bookings (
  id            uuid primary key default gen_random_uuid(),
  barber_id     uuid not null references public.barbers(id) on delete restrict,
  service_id    uuid not null references public.services(id) on delete restrict,
  booking_date  date not null,
  start_time    time not null,
  end_time      time not null,
  duration_min  integer not null check (duration_min > 0),
  price         numeric(6,2) not null check (price >= 0),
  status        public.booking_status not null default 'confirmed',
  client_name   text not null check (length(btrim(client_name)) between 2 and 120),
  client_email  text not null check (client_email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$'),
  client_phone  text not null check (length(btrim(client_phone)) between 6 and 40),
  notes         text not null default '',
  language      text not null default 'de' check (language in ('de','en','tr')),
  user_id       uuid references auth.users(id) on delete set null, -- phase 2
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint bookings_time_order check (end_time > start_time),
  -- Intervalle du rendez-vous, calcule et maintenu par Postgres.
  period tsrange generated always as (
    tsrange((booking_date + start_time)::timestamp,
            (booking_date + end_time)::timestamp, '[)')
  ) stored
);

create index if not exists bookings_date_idx   on public.bookings (booking_date);
create index if not exists bookings_barber_idx on public.bookings (barber_id, booking_date);
create index if not exists bookings_email_idx  on public.bookings (client_email);

-- LE point qui manquait chez le projet de reference : deux rendez-vous qui se
-- chevauchent chez le meme barbier sont refuses par la base elle-meme.
alter table public.bookings
  add constraint bookings_no_overlap
  exclude using gist (
    barber_id with =,
    period    with &&
  ) where (status <> 'cancelled');

create trigger bookings_updated_at
  before update on public.bookings
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------------- vues --

-- Creneaux occupes exposes publiquement SANS aucune donnee personnelle.
-- Le formulaire de reservation appelle cette fonction, jamais la table.
create or replace function public.public_busy_slots(p_from date, p_to date)
returns table (barber_id uuid, booking_date date, start_time time, end_time time)
language sql
stable
security definer
set search_path = public
as $$
  select b.barber_id, b.booking_date, b.start_time, b.end_time
  from public.bookings b
  where b.booking_date between p_from and p_to
    and b.status <> 'cancelled';
$$;

grant execute on function public.public_busy_slots(date, date) to anon, authenticated;
