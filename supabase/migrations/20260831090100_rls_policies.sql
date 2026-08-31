-- ===========================================================================
-- Migration 002 : Row Level Security
--
-- Regle du projet : pour CHAQUE table on ecrit explicitement les quatre
-- verbes SELECT / INSERT / UPDATE / DELETE. Pas de "FOR ALL" implicite, pas
-- de DELETE oublie. Si un verbe n'a pas de policy, il est refuse, et c'est
-- alors une decision assumee et commentee.
--
-- Modele d'acces :
--   anon           lecture du contenu public, aucune ecriture directe
--   authenticated  identique tant que le compte n'est pas admin
--   admin          lecture et ecriture completes via is_admin()
--   service_role   contourne la RLS, utilise uniquement par les Edge Functions
-- ===========================================================================

alter table public.admin_users   enable row level security;
alter table public.services      enable row level security;
alter table public.barbers       enable row level security;
alter table public.opening_hours enable row level security;
alter table public.settings      enable row level security;
alter table public.blocked_slots enable row level security;
alter table public.bookings      enable row level security;

-- ------------------------------------------------------------ admin_users --

create policy "admin_users select own or admin" on public.admin_users
  for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "admin_users insert admin" on public.admin_users
  for insert to authenticated
  with check (public.is_admin());

create policy "admin_users update admin" on public.admin_users
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "admin_users delete admin" on public.admin_users
  for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------- services --

create policy "services select public" on public.services
  for select to anon, authenticated
  using (active or public.is_admin());

create policy "services insert admin" on public.services
  for insert to authenticated
  with check (public.is_admin());

create policy "services update admin" on public.services
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "services delete admin" on public.services
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------- barbers --

create policy "barbers select public" on public.barbers
  for select to anon, authenticated
  using (active or public.is_admin());

create policy "barbers insert admin" on public.barbers
  for insert to authenticated
  with check (public.is_admin());

create policy "barbers update admin" on public.barbers
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "barbers delete admin" on public.barbers
  for delete to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------- opening_hours --

create policy "opening_hours select public" on public.opening_hours
  for select to anon, authenticated
  using (true);

create policy "opening_hours insert admin" on public.opening_hours
  for insert to authenticated
  with check (public.is_admin());

create policy "opening_hours update admin" on public.opening_hours
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "opening_hours delete admin" on public.opening_hours
  for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------- settings --

create policy "settings select public" on public.settings
  for select to anon, authenticated
  using (true);

create policy "settings insert admin" on public.settings
  for insert to authenticated
  with check (public.is_admin());

create policy "settings update admin" on public.settings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- DELETE volontairement interdit : la table est un singleton id = 1.
-- Aucune policy DELETE, donc aucune suppression possible, admin compris.

-- ---------------------------------------------------------- blocked_slots --

-- Lecture publique necessaire : le calcul des creneaux libres se fait cote
-- client. Ces lignes ne contiennent aucune donnee personnelle.
create policy "blocked_slots select public" on public.blocked_slots
  for select to anon, authenticated
  using (true);

create policy "blocked_slots insert admin" on public.blocked_slots
  for insert to authenticated
  with check (public.is_admin());

create policy "blocked_slots update admin" on public.blocked_slots
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "blocked_slots delete admin" on public.blocked_slots
  for delete to authenticated
  using (public.is_admin());

-- --------------------------------------------------------------- bookings --

-- Aucune lecture publique : la table contient nom, e-mail et telephone.
-- Le public passe par la fonction public_busy_slots(), qui ne renvoie que
-- des intervalles horaires.
create policy "bookings select admin" on public.bookings
  for select to authenticated
  using (public.is_admin() or (user_id is not null and user_id = auth.uid()));

-- Aucune policy INSERT pour anon : une reservation ne peut PAS etre ecrite
-- directement depuis le navigateur. Elle passe par l'Edge Function
-- create-booking, qui valide le creneau et ecrit avec la service role.
-- C'est ce qui empeche un tiers d'injecter des reservations arbitraires.
create policy "bookings insert admin" on public.bookings
  for insert to authenticated
  with check (public.is_admin());

create policy "bookings update admin" on public.bookings
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "bookings delete admin" on public.bookings
  for delete to authenticated
  using (public.is_admin());
