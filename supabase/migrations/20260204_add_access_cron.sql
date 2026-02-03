
-- Schedule the update-access function to run every hour
-- Note: This requires the pg_net extension to be enabled in Supabase

-- First, ensure the extensions are available
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule the job
-- The function will be called every hour to block expired users
SELECT
  cron.schedule(
    'block-expired-users-hourly',
    '0 * * * *',
    $$
    SELECT
      net.http_post(
        url:='https://osjvvcbcvlcdmqxczttf.supabase.co/functions/v1/update-access',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
      ) as request_id;
    $$
  );
