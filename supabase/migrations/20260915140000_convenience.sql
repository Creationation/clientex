-- ===========================================================================
-- Migration 004 : confort d'utilisation
--
--  - notes clients du salon (client_notes), cle = telephone normalise
--  - e-mail "Danke" apres le rendez-vous (bookings.followup_sent)
--  - reglages : resume du matin sur Telegram, e-mail de remerciement
--  - booking_by_token() renvoie aussi les ids pour "Nochmal buchen"
--  - close_past_bookings() : les rendez-vous passes passent en "done"
-- ===========================================================================

-- ------------------------------------------------------------ client_notes --

-- Pas de table clients a maintenir en double : les fiches sont reconstruites
-- depuis bookings. Seule la note libre du salon est stockee ici.
create table if not exists public.client_notes (
  phone_key  text primary key check (phone_key ~ '^[0-9]{6,20}$'),
  name       text not null default '',
  note       text not null default '' check (length(note) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger client_notes_updated_at
  before update on public.client_notes
  for each row execute function public.set_updated_at();

alter table public.client_notes enable row level security;

-- Donnees personnelles : admins uniquement, les quatre verbes.
create policy "client_notes select admin" on public.client_notes
  for select to authenticated
  using (public.is_admin());

create policy "client_notes insert admin" on public.client_notes
  for insert to authenticated
  with check (public.is_admin());

create policy "client_notes update admin" on public.client_notes
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "client_notes delete admin" on public.client_notes
  for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------- bookings --

alter table public.bookings
  add column if not exists followup_sent boolean not null default false;

-- ---------------------------------------------------------------- settings --

alter table public.settings
  add column if not exists daily_summary  boolean not null default true,
  add column if not exists followup_email boolean not null default true;

-- --------------------------------------------------------- booking_by_token --

drop function if exists public.booking_by_token(text);

create or replace function public.booking_by_token(p_token text)
returns table (
  booking_date date, start_time time, end_time time, duration_min integer,
  price numeric, discount numeric, status public.booking_status, client_name text,
  barber_name text, service_names_de text[], service_names_en text[],
  service_ids uuid[], barber_id uuid, cancel_deadline_hours integer
)
language sql
stable
security definer
set search_path = public
as $$
  select b.booking_date, b.start_time, b.end_time, b.duration_min,
         b.price, b.discount, b.status, b.client_name,
         coalesce(br.name, ''),
         coalesce((select array_agg(s.name_de order by bs.position)
                   from public.booking_services bs
                   join public.services s on s.id = bs.service_id
                   where bs.booking_id = b.id), '{}'),
         coalesce((select array_agg(coalesce(nullif(s.name_en, ''), s.name_de) order by bs.position)
                   from public.booking_services bs
                   join public.services s on s.id = bs.service_id
                   where bs.booking_id = b.id), '{}'),
         coalesce((select array_agg(bs.service_id order by bs.position)
                   from public.booking_services bs
                   where bs.booking_id = b.id), '{}'),
         b.barber_id,
         (select st.cancel_deadline_hours from public.settings st where st.id = 1)
  from public.bookings b
  left join public.barbers br on br.id = b.barber_id
  where b.manage_token = p_token
    and length(p_token) >= 16;
$$;

grant execute on function public.booking_by_token(text) to anon, authenticated;

-- ------------------------------------------------------ close_past_bookings --

-- Un rendez-vous confirme dont l'heure de fin est passee a eu lieu, sauf
-- avis contraire du salon (no_show). Appelee par le dashboard a l'ouverture
-- et par pg_cron le soir. Un appel depuis le navigateur exige un admin ;
-- pg_cron tourne sans session (auth.uid() null) et passe.
create or replace function public.close_past_bookings()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'FORBIDDEN';
  end if;

  with done as (
    update public.bookings
       set status = 'done'
     where status = 'confirmed'
       and (booking_date + end_time) <= (now() at time zone 'Europe/Vienna')
    returning 1
  )
  select count(*) into v_count from done;

  return v_count;
end;
$$;

revoke all on function public.close_past_bookings() from public;
grant execute on function public.close_past_bookings() to authenticated;
