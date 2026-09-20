-- ===========================================================================
-- Rappels e-mail : planification pg_cron
--
-- Ce fichier n'est PAS une migration : il contient l'URL du projet et la
-- cle service role, qui ne doivent pas etre versionnees avec de vraies
-- valeurs. <SERVICE_ROLE_KEY> est la cle "sb_secret_..." (Settings > API
-- Keys > Secret keys), celle que les fonctions recoivent dans
-- SUPABASE_SERVICE_ROLE_KEY, pas l'ancien JWT. A executer une fois dans le SQL Editor du dashboard Supabase,
-- apres avoir remplace les deux placeholders.
--
-- Prerequis : Dashboard > Database > Extensions > activer pg_cron et pg_net.
-- ===========================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Rejouable : on retire les jobs s'ils existent deja.
do $$
declare
  j text;
begin
  foreach j in array array['delherren-reminders', 'delherren-daily-summary', 'delherren-close-past'] loop
    if exists (select 1 from cron.job where jobname = j) then
      perform cron.unschedule(j);
    end if;
  end loop;
end;
$$;

-- Toutes les 30 minutes. La fonction decide elle-meme qui rappeler
-- (fenetres 23-25 h et 1,5-2,5 h) et ne renvoie jamais deux fois le meme.
select cron.schedule(
  'delherren-reminders',
  '*/30 * * * *',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/process-reminders',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{}'::jsonb
  ) as request_id;
  $$
);

-- Resume du jour sur Telegram : 07:30 heure de Vienne. pg_cron tourne en UTC,
-- donc 05:30 UTC en ete (CEST) et 06:30 en hiver (CET). On prend 05:30 :
-- en hiver le message arrive a 06:30, toujours avant l'ouverture.
select cron.schedule(
  'delherren-daily-summary',
  '30 5 * * 1-6',
  $$
  select net.http_post(
    url     := 'https://<PROJECT_REF>.supabase.co/functions/v1/send-daily-summary',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{}'::jsonb
  ) as request_id;
  $$
);

-- Cloture du soir : les rendez-vous confirmes dont l'heure est passee
-- deviennent "erledigt". Fonction SQL, pas besoin d'Edge Function.
select cron.schedule(
  'delherren-close-past',
  '0 20 * * *',
  $$ select public.close_past_bookings(); $$
);

-- Verifier : select jobid, jobname, schedule, active from cron.job;
-- Historique : select * from cron.job_run_details order by start_time desc limit 20;
