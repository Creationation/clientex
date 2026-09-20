-- ===========================================================================
-- Donnees de demarrage DEL Herren.
--
--   supabase db reset          (local, applique migrations + ce seed)
--   psql "$DB_URL" -f supabase/seed.sql   (distant)
--
-- Prestations et prix : liste affichee en vitrine du salon (photo du
-- 15 septembre 2026). Les durees sont des estimations, modifiables dans
-- l'admin. A confirmer avec le client : prenoms et nombre de barbiers.
-- ===========================================================================

-- ---------------------------------------------------------------- services --

insert into public.services (slug, name_de, name_en, duration_min, price, category, sort_order)
values
  ('schneiden-foehnen-stylen',         'Schneiden, Föhnen, Stylen',          'Cut, blow-dry & style',        30, 18.00, 'hair',  1),
  ('schneiden-waschen-foehnen-stylen', 'Schneiden, Waschen, Föhnen, Stylen', 'Cut, wash, blow-dry & style',  40, 23.00, 'hair',  2),
  ('maschinenhaarschnitt',             'Maschinenhaarschnitt',               'Clipper cut',                  20, 14.00, 'hair',  3),
  ('waschen-foehnen-stylen',           'Waschen, Föhnen, Stylen',            'Wash, blow-dry & style',       15,  7.00, 'hair',  4),
  ('bartrasur',                        'Bartrasur',                          'Beard shave',                  15, 10.00, 'beard', 5),
  ('modellrasur',                      'Modellrasur',                        'Beard shaping',                20, 12.00, 'beard', 6),
  ('kopfrasur',                        'Kopf rasieren',                      'Head shave',                   20, 14.00, 'shave', 7),
  ('waschen-schneiden-faerben',        'Waschen, Schneiden, Färben',         'Wash, cut & colour',           60, 33.00, 'color', 8),
  ('haare-faerben',                    'Haare färben',                       'Hair colouring',               30, 15.00, 'color', 9),
  ('bart-faerben',                     'Bart färben',                        'Beard colouring',              15, 10.00, 'color', 10),
  ('kinder-bis-12',                    'Kinder bis 12 Jahre',                'Kids up to 12 years',          25, 12.00, 'kids',  11),
  ('augenbrauen-zupfen',               'Augenbrauen zupfen',                 'Eyebrow plucking',             10,  7.00, 'extra', 12),
  ('gesichtsmaske',                    'Gesichtsmaske',                      'Face mask',                    15,  7.00, 'extra', 13),
  ('gesichtsharzen',                   'Gesichtsharzen',                     'Face waxing',                  15,  7.00, 'extra', 14)
on conflict (slug) do update set
  name_de      = excluded.name_de,
  name_en      = excluded.name_en,
  duration_min = excluded.duration_min,
  price        = excluded.price,
  category     = excluded.category,
  sort_order   = excluded.sort_order;

-- Les anciennes prestations de demonstration, si elles existent encore,
-- sont desactivees plutot que supprimees : des reservations peuvent y pointer.
update public.services set active = false
where slug in ('haarschnitt','schnitt-bart','rasiermesser-cut','kinderhaarschnitt',
               'bartpflege','messerrasur','augenbrauen','waschen-styling');

-- ----------------------------------------------------------------- barbers --

insert into public.barbers (name, initials, role_de, role_en, image_url, sort_order)
select v.name, v.initials, v.role_de, v.role_en, v.image_url, v.sort_order
from (values
  ('Del',     'D', 'Inhaber & Barber', 'Owner & barber', '/media/team-del.jpg',     1),
  ('Mustafa', 'M', 'Barber',           'Barber',         '/media/team-mustafa.jpg', 2)
) as v(name, initials, role_de, role_en, image_url, sort_order)
where not exists (select 1 from public.barbers b where b.name = v.name);

-- Jours de repos fixes : Del le mardi (2), Mustafa le mercredi (3).
insert into public.barber_hours (barber_id, weekday, active, start_time, end_time)
select b.id, v.weekday, false, '09:00', '19:00'
from (values ('Del', 2), ('Mustafa', 3)) as v(name, weekday)
join public.barbers b on b.name = v.name
on conflict (barber_id, weekday) do update set active = excluded.active;

-- ----------------------------------------------------------- opening_hours --

insert into public.opening_hours (weekday, is_open, open_time, close_time)
values
  (1, true,  '09:00', '19:00'),
  (2, true,  '09:00', '19:00'),
  (3, true,  '09:00', '19:00'),
  (4, true,  '09:00', '19:00'),
  (5, true,  '09:00', '19:00'),
  (6, true,  '09:00', '18:00'),
  (0, false, '09:00', '18:00')
on conflict (weekday) do update set
  is_open    = excluded.is_open,
  open_time  = excluded.open_time,
  close_time = excluded.close_time;

-- ---------------------------------------------------------------- settings --

insert into public.settings (id, slot_granularity_min, min_lead_time_min, max_advance_days, buffer_after_min,
                             auto_confirm, cancel_deadline_hours, email_reminders, reminder_24h, reminder_2h)
values (1, 15, 60, 60, 0, true, 24, true, true, true)
on conflict (id) do nothing;

-- ------------------------------------------------------------- promo_codes --
-- Codes de demonstration. A remplacer par ceux du salon, ou a desactiver.

insert into public.promo_codes (code, description, discount_type, discount_value, min_order, max_uses)
values
  ('WILLKOMMEN10', '10 % für Neukunden', 'percent', 10, 0,  null),
  ('DEL5',         '5 EUR ab 25 EUR',    'fixed',   5,  25, 100)
on conflict (code) do nothing;

-- ------------------------------------------------------------- admin_users --
--
-- 1. Creer le compte dans Supabase Auth :
--    Dashboard > Authentication > Users > Add user
--    E-mail : renardiego@gmail.com   Mot de passe : au choix, puis "Auto confirm"
--
-- 2. Lui donner l'acces au dashboard :

insert into public.admin_users (user_id, email, name)
select id, email, 'Diego Renard'
from auth.users
where lower(email) = 'renardiego@gmail.com'
on conflict (user_id) do update set name = excluded.name;

-- 3. Les acces suivants se creent depuis l'onglet "Zugänge" du dashboard,
--    a condition que le compte existe deja dans Auth (fonction grant_admin).
--
-- Sans l'etape 2, aucun compte ne peut ouvrir /admin.
