-- ===========================================================================
-- Migration 003 : prise de rendez-vous v2, calquee sur sitdown-studio
--
--  - horaires propres a chaque barbier (barber_hours)
--  - absences / conges sur une plage de dates (barber_absences)
--  - lien de gestion du rendez-vous par jeton secret (bookings.manage_token)
--  - origine, annulation, rappels e-mail (colonnes sur bookings)
--  - reglages : delai d'annulation en ligne et rappels
--  - nouvelles categories de prestations : farben, kinder
--
-- Regle du projet : RLS sur chaque table, et les quatre verbes ecrits
-- explicitement, DELETE compris.
-- ===========================================================================

-- --------------------------------------------------------------- services --

alter table public.services drop constraint if exists services_category_check;
alter table public.services
  add constraint services_category_check
  check (category in ('hair','beard','shave','color','kids','extra'));

-- ----------------------------------------------------------- barber_hours --

-- Une ligne par barbier et jour de semaine. Pas de ligne = horaires du salon.
-- active = false : le barbier ne travaille pas ce jour-la.
create table if not exists public.barber_hours (
  barber_id  uuid not null references public.barbers(id) on delete cascade,
  weekday    smallint not null check (weekday between 0 and 6),
  active     boolean not null default true,
  start_time time not null default '09:00',
  end_time   time not null default '18:00',
  updated_at timestamptz not null default now(),
  primary key (barber_id, weekday),
  constraint barber_hours_order check (end_time > start_time)
);

create trigger barber_hours_updated_at
  before update on public.barber_hours
  for each row execute function public.set_updated_at();

alter table public.barber_hours enable row level security;

-- Lecture publique : necessaire au calcul des creneaux, aucune donnee
-- personnelle (un nom de barbier est deja public).
create policy "barber_hours select public" on public.barber_hours
  for select to anon, authenticated
  using (true);

create policy "barber_hours insert admin" on public.barber_hours
  for insert to authenticated
  with check (public.is_admin());

create policy "barber_hours update admin" on public.barber_hours
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "barber_hours delete admin" on public.barber_hours
  for delete to authenticated
  using (public.is_admin());

-- -------------------------------------------------------- barber_absences --

create table if not exists public.barber_absences (
  id         uuid primary key default gen_random_uuid(),
  barber_id  uuid not null references public.barbers(id) on delete cascade,
  start_date date not null,
  end_date   date not null,
  reason     text not null default '',
  created_at timestamptz not null default now(),
  constraint barber_absences_order check (end_date >= start_date)
);

create index if not exists barber_absences_range_idx
  on public.barber_absences (barber_id, start_date, end_date);

alter table public.barber_absences enable row level security;

-- Le motif (Krankenstand...) est une information sur une personne : la table
-- n'est lisible que par les admins. Le public passe par list_absences(),
-- qui ne renvoie que les dates.
create policy "barber_absences select admin" on public.barber_absences
  for select to authenticated
  using (public.is_admin());

create policy "barber_absences insert admin" on public.barber_absences
  for insert to authenticated
  with check (public.is_admin());

create policy "barber_absences update admin" on public.barber_absences
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "barber_absences delete admin" on public.barber_absences
  for delete to authenticated
  using (public.is_admin());

create or replace function public.list_absences(p_from date, p_to date)
returns table (id uuid, barber_id uuid, start_date date, end_date date, reason text)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.barber_id, a.start_date, a.end_date,
         case when public.is_admin() then a.reason else '' end as reason
  from public.barber_absences a
  where a.start_date <= p_to and a.end_date >= p_from
  order by a.start_date;
$$;

grant execute on function public.list_absences(date, date) to anon, authenticated;

-- --------------------------------------------------------------- bookings --

alter table public.bookings
  add column if not exists manage_token     text not null default encode(gen_random_bytes(24), 'hex'),
  add column if not exists source           text not null default 'online' check (source in ('online','admin')),
  add column if not exists cancelled_at     timestamptz,
  add column if not exists reminder_sent_24h boolean not null default false,
  add column if not exists reminder_sent_2h  boolean not null default false;

create unique index if not exists bookings_manage_token_idx on public.bookings (manage_token);

-- Ce que le client voit depuis son lien : pas d'id interne, pas de jeton,
-- pas de donnees d'un autre rendez-vous. Le jeton fait office de mot de passe
-- a usage unique, 48 caracteres hexadecimaux, impossible a deviner.
create or replace function public.booking_by_token(p_token text)
returns table (
  booking_date date, start_time time, end_time time, duration_min integer,
  price numeric, status public.booking_status, client_name text,
  barber_name text, service_names_de text[], service_names_en text[],
  cancel_deadline_hours integer
)
language sql
stable
security definer
set search_path = public
as $$
  select b.booking_date, b.start_time, b.end_time, b.duration_min,
         b.price, b.status, b.client_name,
         coalesce(br.name, ''),
         coalesce((select array_agg(s.name_de order by bs.position)
                   from public.booking_services bs
                   join public.services s on s.id = bs.service_id
                   where bs.booking_id = b.id), '{}'),
         coalesce((select array_agg(coalesce(nullif(s.name_en, ''), s.name_de) order by bs.position)
                   from public.booking_services bs
                   join public.services s on s.id = bs.service_id
                   where bs.booking_id = b.id), '{}'),
         (select st.cancel_deadline_hours from public.settings st where st.id = 1)
  from public.bookings b
  left join public.barbers br on br.id = b.barber_id
  where b.manage_token = p_token
    and length(p_token) >= 16;
$$;

grant execute on function public.booking_by_token(text) to anon, authenticated;

-- --------------------------------------------------------------- settings --

alter table public.settings
  add column if not exists cancel_deadline_hours integer not null default 24 check (cancel_deadline_hours >= 0),
  add column if not exists email_reminders       boolean not null default true,
  add column if not exists reminder_24h          boolean not null default true,
  add column if not exists reminder_2h           boolean not null default true;

-- --------------------------------------------------------------- realtime --

-- Le dashboard s'abonne aux changements de bookings. La RLS s'applique aussi
-- aux evenements Realtime : seul un admin authentifie recoit les lignes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'bookings'
  ) then
    alter publication supabase_realtime add table public.bookings;
  end if;
end;
$$;
