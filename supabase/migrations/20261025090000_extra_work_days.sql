-- Jour de travail exceptionnel d'un barbier.
--
-- barber_absences ne savait dire que "absent". Un barbier qui deplace son jour
-- (Ayouan, qui ne vient que le mercredi, travaille un jeudi a la place) ne
-- pouvait pas s'ouvrir ce jeudi sans changer TOUS les jeudis dans ses horaires
-- de la semaine. Une ligne kind = 'work' l'ouvre sur ces dates seulement :
--   - elle remplace ses horaires de la semaine pour ces dates ;
--   - start_time / end_time vides = horaires du salon ;
--   - une absence (kind = 'off') le meme jour l'emporte toujours.

alter table public.barber_absences
  add column if not exists kind       text not null default 'off' check (kind in ('off', 'work')),
  add column if not exists start_time time,
  add column if not exists end_time   time;

alter table public.barber_absences
  drop constraint if exists barber_absences_times;
alter table public.barber_absences
  add constraint barber_absences_times check (
    (start_time is null and end_time is null)
    or (start_time is not null and end_time is not null and end_time > start_time)
  );

-- Le type de retour change : il faut supprimer la fonction avant de la recreer.
drop function if exists public.list_absences(date, date);

create function public.list_absences(p_from date, p_to date)
returns table (
  id uuid, barber_id uuid, start_date date, end_date date, reason text,
  kind text, start_time time, end_time time
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.barber_id, a.start_date, a.end_date,
         case when public.is_admin() then a.reason else '' end as reason,
         a.kind, a.start_time, a.end_time
  from public.barber_absences a
  where a.start_date <= p_to and a.end_date >= p_from
  order by a.start_date;
$$;

grant execute on function public.list_absences(date, date) to anon, authenticated;
