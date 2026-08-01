-- Invite tracking for the friend/referral loop. Clients log through an RPC so
-- admin analytics can measure invite usage without exposing direct inserts.

CREATE TABLE IF NOT EXISTS public.invite_share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  channel text NOT NULL,
  outcome text NOT NULL DEFAULT 'started',
  target_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS invite_share_events_created_at_idx
  ON public.invite_share_events (created_at DESC);
CREATE INDEX IF NOT EXISTS invite_share_events_user_id_idx
  ON public.invite_share_events (user_id);
CREATE INDEX IF NOT EXISTS invite_share_events_channel_idx
  ON public.invite_share_events (channel);

ALTER TABLE public.invite_share_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.invite_share_events FROM anon, authenticated;
GRANT ALL ON TABLE public.invite_share_events TO service_role;

CREATE OR REPLACE FUNCTION public.log_invite_share(
  p_channel text,
  p_outcome text DEFAULT 'started',
  p_target_url text DEFAULT NULL
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

  INSERT INTO public.invite_share_events (
    user_id,
    channel,
    outcome,
    target_url
  )
  VALUES (
    auth.uid(),
    left(coalesce(nullif(p_channel, ''), 'unknown'), 32),
    left(coalesce(nullif(p_outcome, ''), 'started'), 32),
    left(nullif(p_target_url, ''), 512)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_invite_share(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_invite_share(text, text, text)
  TO authenticated;
