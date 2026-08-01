-- Rank-up and Regular celebration tracking. Clients write through an RPC so
-- celebration usage can feed admin analytics without exposing raw inserts.

CREATE TABLE IF NOT EXISTS public.celebration_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL,
  achievement_key text NOT NULL,
  channel text NOT NULL,
  outcome text NOT NULL DEFAULT 'shown',
  location_id bigint REFERENCES public.locations(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS celebration_events_created_at_idx
  ON public.celebration_events (created_at DESC);
CREATE INDEX IF NOT EXISTS celebration_events_user_id_idx
  ON public.celebration_events (user_id);
CREATE INDEX IF NOT EXISTS celebration_events_kind_idx
  ON public.celebration_events (kind);
CREATE INDEX IF NOT EXISTS celebration_events_channel_idx
  ON public.celebration_events (channel);

ALTER TABLE public.celebration_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.celebration_events FROM anon, authenticated;
GRANT ALL ON TABLE public.celebration_events TO service_role;

CREATE OR REPLACE FUNCTION public.log_celebration_event(
  p_kind text,
  p_achievement_key text,
  p_channel text,
  p_outcome text DEFAULT 'shown',
  p_location_id bigint DEFAULT NULL
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

  INSERT INTO public.celebration_events (
    user_id,
    kind,
    achievement_key,
    channel,
    outcome,
    location_id
  )
  VALUES (
    auth.uid(),
    left(coalesce(nullif(p_kind, ''), 'unknown'), 32),
    left(coalesce(nullif(p_achievement_key, ''), 'unknown'), 64),
    left(coalesce(nullif(p_channel, ''), 'unknown'), 32),
    left(coalesce(nullif(p_outcome, ''), 'shown'), 32),
    p_location_id
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_celebration_event(text, text, text, text, bigint)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_celebration_event(text, text, text, text, bigint)
  TO authenticated;
