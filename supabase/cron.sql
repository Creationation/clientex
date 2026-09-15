-- ===========================================================================
-- Rappels e-mail : planification pg_cron
--
-- Ce fichier n'est PAS une migration : il contient l'URL du projet et la
-- cle service role, qui ne doivent pas etre versionnees avec de vraies
-- valeurs. A executer une fois dans le SQL Editor du dashboard Supabase,
-- apres avoir remplace les deux placeholders.
--
-- Prerequis : Dashboard > Database > Extensions > activer pg_cron et pg_net.
-- ===========================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Rejouable : on retire le job s'il existe deja.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'delherren-reminders') then
    perform cron.unschedule('delherren-reminders');
  end if;
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

-- Verifier : select jobid, jobname, schedule, active from cron.job;
-- Historique : select * from cron.job_run_details order by start_time desc limit 20;
