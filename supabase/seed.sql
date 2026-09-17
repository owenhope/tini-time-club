-- Reference data a fresh database needs before the app (or the pgTAP suite)
-- can run. Hosted projects already carry these rows; ON CONFLICT keeps the
-- seed idempotent everywhere.

INSERT INTO public.notification_types (id, name)
VALUES
  (1, 'following'),
  (2, 'user')
ON CONFLICT (id) DO NOTHING;
