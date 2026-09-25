-- Runs the send-reminders Edge Function every 5 minutes via pg_net. The
-- function requires a valid Supabase JWT (verify_jwt: true) — the anon key
-- below is the project's public/publishable key, the same one already
-- committed in .env.production and src/lib/supabase/config.ts. It has no
-- special privilege; send-reminders does its own work with the
-- service-role key it's given automatically, not this one.
select cron.schedule(
  'send-reminders',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://bvapxwiryuzzbxesbtqo.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2YXB4d2lyeXV6emJ4ZXNidHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkzODIwNDAsImV4cCI6MjEwNDk1ODA0MH0.JY33jU_EE_mUX2QO8zAGdTK2021ERkminaMvpQcj2-o'
    ),
    body := '{}'::jsonb
  );
  $$
);
