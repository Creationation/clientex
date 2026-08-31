-- ===========================================================================
-- Donnees de demarrage DEL Herren.
--
--   supabase db reset          (local, applique migrations + ce seed)
--   psql "$DB_URL" -f supabase/seed.sql   (distant)
--
-- A CONFIRMER AVEC LE CLIENT avant mise en production :
--   - horaires exacts du lundi au dimanche
--   - duree et prix reels de chaque prestation
--   - prenoms et nombre de barbiers
-- ===========================================================================

-- ---------------------------------------------------------------- services --

insert into public.services (slug, name_de, name_en, duration_min, price, category, sort_order)
values
  ('haarschnitt',       'Herrenhaarschnitt',      'Men''s haircut',       30, 25.00, 'hair',  1),
  ('schnitt-bart',      'Haarschnitt & Bart',     'Haircut & beard',            45, 38.00, 'hair',  2),
  ('rasiermesser-cut',  'Rasiermesser-Schnitt',   'Razor cut',           40, 30.00, 'hair',  3),
  ('kinderhaarschnitt', 'Kinderhaarschnitt',      'Kids haircut',       25, 18.00, 'hair',  4),
  ('bartpflege',        'Bartpflege',             'Beard trim',           20, 15.00, 'beard', 5),
  ('messerrasur',       'Rasur mit Rasiermesser', 'Straight razor shave',        30, 22.00, 'shave', 6),
  ('kopfrasur',         'Kopfrasur',              'Head shave',             20, 18.00, 'shave', 7),
  ('augenbrauen',       'Augenbrauen',            'Eyebrow trimming',           10,  8.00, 'extra', 8),
  ('waschen-styling',   'Waschen & Styling',      'Shampoo & styling', 15, 10.00, 'extra', 9)
on conflict (slug) do update set
  name_de      = excluded.name_de,
  name_en      = excluded.name_en,
  duration_min = excluded.duration_min,
  price        = excluded.price,
  category     = excluded.category,
  sort_order   = excluded.sort_order;

-- ----------------------------------------------------------------- barbers --

insert into public.barbers (name, initials, role_de, role_en, sort_order)
select v.name, v.initials, v.role_de, v.role_en, v.sort_order
from (values
  ('Ali',    'A', 'Inhaber & Master Barber',     'Owner & master barber', 1),
  ('Mehmet', 'M', 'Barber & Fade-Spezialist',    'Barber & fade specialist', 2),
  ('Serkan', 'S', 'Barber & Rasur-Spezialist',   'Barber & shave specialist', 3)
) as v(name, initials, role_de, role_en, sort_order)
where not exists (select 1 from public.barbers b where b.name = v.name);

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

insert into public.settings (id, slot_granularity_min, min_lead_time_min, max_advance_days, buffer_after_min, auto_confirm)
values (1, 15, 60, 60, 0, true)
on conflict (id) do nothing;

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

-- 3. Les acces suivants se creent depuis l'onglet "Zugange" du dashboard,
--    a condition que le compte existe deja dans Auth (fonction grant_admin).
--
-- Sans l'etape 2, aucun compte ne peut ouvrir /admin.
