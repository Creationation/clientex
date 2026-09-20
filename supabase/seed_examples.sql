-- ===========================================================================
-- Rendez-vous d'EXEMPLE pour montrer le dashboard a Del.
--
-- A executer une fois, apres seed.sql. Genere une quinzaine de jours de
-- rendez-vous autour d'aujourd'hui, respectant le dimanche, le mardi de Del
-- et le mercredi de Mustafa. Tous les clients s'appellent "... (Beispiel)".
--
-- AVANT LA MISE EN LIGNE, tout retirer d'un coup :
--   delete from public.bookings where client_name like '%(Beispiel)';
-- ===========================================================================

with
  brb as (select id, name from public.barbers where name in ('Del', 'Mustafa')),
  svc as (select id, slug, duration_min, price from public.services where active),
  plan (day_offset, barber, start_time, slugs, client, phone, notes) as (values
    (-8, 'Del',     '09:00', array['schneiden-foehnen-stylen'],                   'Lukas Berger',   '+43 660 1100001', ''),
    (-8, 'Del',     '11:30', array['schneiden-waschen-foehnen-stylen','bartrasur'], 'Deniz Yilmaz',   '+43 660 1100002', 'Fade auf 3 mm, wie beim letzten Mal'),
    (-8, 'Mustafa', '10:00', array['maschinenhaarschnitt'],                       'Marco Huber',    '+43 660 1100003', ''),
    (-7, 'Del',     '14:00', array['kinder-bis-12'],                              'Familie Gruber', '+43 660 1100004', ''),
    (-7, 'Mustafa', '09:30', array['kopfrasur','bartrasur'],                      'Onur Demir',     '+43 660 1100005', ''),
    (-7, 'Mustafa', '16:15', array['schneiden-foehnen-stylen'],                   'Jonas Maier',    '+43 660 1100006', ''),
    (-6, 'Del',     '10:15', array['waschen-schneiden-faerben'],                  'Philipp Wagner', '+43 660 1100007', ''),
    (-6, 'Mustafa', '13:00', array['modellrasur'],                                'Ahmet Kaya',     '+43 660 1100008', ''),
    (-5, 'Del',     '15:30', array['schneiden-foehnen-stylen','augenbrauen-zupfen'], 'Stefan Novak', '+43 660 1100009', ''),
    (-5, 'Mustafa', '11:00', array['schneiden-waschen-foehnen-stylen'],           'Emre Sahin',     '+43 660 1100010', ''),
    (-4, 'Del',     '09:00', array['maschinenhaarschnitt'],                       'Paul Steiner',   '+43 660 1100011', ''),
    (-3, 'Mustafa', '14:45', array['schneiden-foehnen-stylen','bartrasur'],       'Daniel Hofer',   '+43 660 1100012', ''),
    (-2, 'Del',     '17:00', array['schneiden-foehnen-stylen'],                   'Lukas Berger',   '+43 660 1100001', ''),
    (-1, 'Mustafa', '10:00', array['kinder-bis-12'],                              'Florian Bauer',  '+43 660 1100013', ''),
    ( 0, 'Del',     '10:00', array['schneiden-foehnen-stylen'],                   'Tobias Leitner', '+43 660 1100014', ''),
    ( 0, 'Del',     '14:00', array['schneiden-waschen-foehnen-stylen','modellrasur'], 'Kerem Aydin', '+43 660 1100015', ''),
    ( 0, 'Mustafa', '11:30', array['maschinenhaarschnitt'],                       'Michael Pichler','+43 660 1100016', ''),
    ( 0, 'Mustafa', '16:15', array['kopfrasur'],                                  'Sebastian Wolf', '+43 660 1100017', ''),
    ( 1, 'Del',     '09:00', array['schneiden-foehnen-stylen','bartrasur'],       'Amir Hassan',    '+43 660 1100018', 'Bart nur in Form bringen'),
    ( 1, 'Mustafa', '13:00', array['waschen-schneiden-faerben'],                  'Nikolaus Auer',  '+43 660 1100019', ''),
    ( 2, 'Del',     '11:30', array['schneiden-foehnen-stylen'],                   'David Schmid',   '+43 660 1100020', ''),
    ( 2, 'Mustafa', '09:30', array['kinder-bis-12'],                              'Familie Gruber', '+43 660 1100004', ''),
    ( 3, 'Del',     '15:30', array['maschinenhaarschnitt','bart-faerben'],        'Yusuf Koc',      '+43 660 1100021', ''),
    ( 3, 'Mustafa', '17:45', array['schneiden-foehnen-stylen'],                   'Matthias Egger', '+43 660 1100022', ''),
    ( 4, 'Del',     '10:15', array['schneiden-waschen-foehnen-stylen'],           'Adrian Mandic',  '+43 660 1100023', ''),
    ( 5, 'Mustafa', '14:45', array['schneiden-foehnen-stylen','augenbrauen-zupfen'], 'Samir Nasser', '+43 660 1100024', ''),
    ( 6, 'Del',     '09:00', array['schneiden-foehnen-stylen'],                   'Georg Steiner',  '+43 660 1100025', ''),
    ( 7, 'Mustafa', '11:00', array['modellrasur','bartrasur'],                    'Deniz Yilmaz',   '+43 660 1100002', ''),
    ( 8, 'Del',     '14:00', array['schneiden-foehnen-stylen'],                   'Lukas Berger',   '+43 660 1100001', ''),
    ( 9, 'Mustafa', '10:00', array['kopfrasur'],                                  'Emre Sahin',     '+43 660 1100010', '')
  ),
  rows as (
    select
      p.*,
      (current_date + p.day_offset)::date as booking_date,
      b.id as barber_id,
      (select sum(s.duration_min) from svc s where s.slug = any(p.slugs)) as duration_min,
      (select sum(s.price) from svc s where s.slug = any(p.slugs)) as price
    from plan p
    join brb b on b.name = p.barber
    -- dimanche ferme, mardi de Del, mercredi de Mustafa
    where extract(dow from current_date + p.day_offset) <> 0
      and not (p.barber = 'Del' and extract(dow from current_date + p.day_offset) = 2)
      and not (p.barber = 'Mustafa' and extract(dow from current_date + p.day_offset) = 3)
  ),
  inserted as (
    insert into public.bookings
      (barber_id, booking_date, start_time, end_time, duration_min, price, status, source,
       client_name, client_email, client_phone, notes, language,
       reminder_sent_24h, reminder_sent_2h, followup_sent)
    select
      r.barber_id, r.booking_date, r.start_time::time,
      (r.start_time::time + make_interval(mins => r.duration_min::int)),
      r.duration_min, r.price,
      case
        when r.day_offset < 0 and r.client = 'Paul Steiner' then 'no_show'::public.booking_status
        when r.day_offset < 0 then 'done'::public.booking_status
        when r.day_offset > 4 and r.client = 'Samir Nasser' then 'pending'::public.booking_status
        else 'confirmed'::public.booking_status
      end,
      case when r.client in ('Familie Gruber', 'Georg Steiner') then 'admin' else 'online' end,
      r.client || ' (Beispiel)',
      'walkin@delherren.local',  -- adresse de remplissage : aucun e-mail ne part pour les exemples
      r.phone, r.notes, 'de',
      r.day_offset < 0, r.day_offset < 0, r.day_offset < 0
    from rows r
    returning id, client_name, booking_date, start_time
  )
insert into public.booking_services (booking_id, service_id, position)
select i.id, s.id, ord - 1
from inserted i
join rows r on r.client || ' (Beispiel)' = i.client_name and r.booking_date = i.booking_date and r.start_time::time = i.start_time
cross join lateral unnest(r.slugs) with ordinality as u(slug, ord)
join svc s on s.slug = u.slug;

-- Une note client, pour montrer la fiche Kunden.
insert into public.client_notes (phone_key, name, note)
values ('436601100002', 'Deniz Yilmaz (Beispiel)', 'Fade auf 3 mm, links etwas kürzer. Mag keinen Smalltalk.')
on conflict (phone_key) do nothing;
