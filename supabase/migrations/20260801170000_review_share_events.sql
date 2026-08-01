-- Review share tracking. Clients write through an RPC so the table remains
-- private while admin analytics can read it with the service role.

CREATE TABLE IF NOT EXISTS public.review_share_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  review_id bigint NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  channel text NOT NULL,
  outcome text NOT NULL DEFAULT 'started',
  shared_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS review_share_events_shared_at_idx
  ON public.review_share_events (shared_at DESC);
CREATE INDEX IF NOT EXISTS review_share_events_user_id_idx
  ON public.review_share_events (user_id);
CREATE INDEX IF NOT EXISTS review_share_events_review_id_idx
  ON public.review_share_events (review_id);
CREATE INDEX IF NOT EXISTS review_share_events_channel_idx
  ON public.review_share_events (channel);

ALTER TABLE public.review_share_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.review_share_events FROM anon, authenticated;
GRANT ALL ON TABLE public.review_share_events TO service_role;

CREATE OR REPLACE FUNCTION public.log_review_share(
  p_review_id bigint,
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
    SELECT 1 FROM public.reviews r
    WHERE r.id = p_review_id
      AND r.state = 1
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.review_share_events (user_id, review_id, channel, outcome)
  VALUES (
    auth.uid(),
    p_review_id,
    left(coalesce(nullif(p_channel, ''), 'unknown'), 32),
    left(coalesce(nullif(p_outcome, ''), 'started'), 32)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_review_share(bigint, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_review_share(bigint, text, text)
  TO authenticated;
