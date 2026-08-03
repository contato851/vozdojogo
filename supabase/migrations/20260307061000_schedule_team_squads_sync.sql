
-- Schedules the daily refresh of public.team_squads by calling the
-- sync-team-squads edge function through pg_cron + pg_net.
--
-- One-time manual setup required before this job can succeed (cannot be done
-- from a migration, since it involves a real secret value):
--   1. Set the CRON_SECRET edge function secret to a random string, e.g.
--        supabase secrets set CRON_SECRET=<a-random-string>
--      (or via Dashboard > Edge Functions > Secrets), same place API_FOOTBALL_KEY lives.
--   2. Store that same value in Vault so this SQL job can send it as a header,
--      run once in the SQL editor:
--        select vault.create_secret('<the-same-random-string>', 'cron_secret');
--
-- Until step 2 is done the job will run daily but every call will fail with 401,
-- which is safe (team_squads just won't get refreshed until it's completed).

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

SELECT cron.schedule(
  'sync-team-squads-daily',
  '17 5 * * *', -- 05:17 UTC daily — off-peak, avoids round-number thundering herds
  $$
  SELECT net.http_post(
    url := 'https://pkqjareakzazzwttxqjl.supabase.co/functions/v1/sync-team-squads',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'cron_secret' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
