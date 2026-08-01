-- Profile share tracking. Mirrors review_share_events so sharing remains
-- visible in admin while clients never write analytics rows directly.

CREATE TABLE IF NOT EXISTS public.profile_share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  channel text NOT NULL,
  outcome text NOT NULL DEFAULT 'started',
  shared_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS profile_share_events_shared_at_idx
  ON public.profile_share_events (shared_at DESC);
CREATE INDEX IF NOT EXISTS profile_share_events_user_id_idx
  ON public.profile_share_events (user_id);
CREATE INDEX IF NOT EXISTS profile_share_events_profile_id_idx
  ON public.profile_share_events (profile_id);
CREATE INDEX IF NOT EXISTS profile_share_events_channel_idx
  ON public.profile_share_events (channel);

ALTER TABLE public.profile_share_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.profile_share_events FROM anon, authenticated;
GRANT ALL ON TABLE public.profile_share_events TO service_role;

CREATE OR REPLACE FUNCTION public.log_profile_share(
  p_profile_id uuid,
  p_channel text,
  p_outcome text DEFAULT 'started'
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

  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = p_profile_id
      AND p.deleted = false
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.profile_share_events (
    user_id,
    profile_id,
    channel,
    outcome
  )
  VALUES (
    auth.uid(),
    p_profile_id,
    left(coalesce(nullif(p_channel, ''), 'unknown'), 32),
    left(coalesce(nullif(p_outcome, ''), 'started'), 32)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_profile_share(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_profile_share(uuid, text, text)
  TO authenticated;
