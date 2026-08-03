
-- Removed the automatic squad-fetch feature (fetch-squad / sync-team-squads
-- edge functions deleted). This stops the daily cron job that kept
-- team_squads warm; nothing left calls it.
SELECT cron.unschedule('sync-team-squads-daily');
