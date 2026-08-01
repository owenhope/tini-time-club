-- Notification open tracking. The app logs an open when a member taps a
-- push (remote) or the Tini Time reminder (local). Rows are written only
-- through the RPC — clients get no direct table access — and the admin
-- reads them with the service role for open-rate and conversion analytics.

CREATE TABLE IF NOT EXISTS public.notification_opens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE SET NULL,
  kind text,
  opened_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_opens_opened_at_idx
  ON public.notification_opens (opened_at DESC);
CREATE INDEX IF NOT EXISTS notification_opens_kind_idx
  ON public.notification_opens (kind);

ALTER TABLE public.notification_opens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.notification_opens FROM anon, authenticated;
GRANT ALL ON TABLE public.notification_opens TO service_role;

CREATE OR REPLACE FUNCTION public.log_notification_open(
  p_kind text DEFAULT NULL,
  p_notification_id uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.notification_opens (user_id, notification_id, kind)
  VALUES (auth.uid(), p_notification_id, left(p_kind, 64));
END;
$$;

REVOKE ALL ON FUNCTION public.log_notification_open(text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_notification_open(text, uuid)
  TO authenticated;
