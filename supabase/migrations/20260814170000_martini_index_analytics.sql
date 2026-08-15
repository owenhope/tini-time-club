-- Minimal product analytics for the Martini Index. Clients write through the
-- RPC only; production admin analytics reads the private event rows with the
-- service role.

CREATE TABLE IF NOT EXISTS public.martini_index_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('view', 'filter', 'generate')),
  value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS martini_index_events_created_at_idx
  ON public.martini_index_events (created_at DESC);
CREATE INDEX IF NOT EXISTS martini_index_events_kind_idx
  ON public.martini_index_events (kind);
CREATE INDEX IF NOT EXISTS martini_index_events_user_id_idx
  ON public.martini_index_events (user_id);

ALTER TABLE public.martini_index_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.martini_index_events FROM anon, authenticated;
GRANT ALL ON TABLE public.martini_index_events TO service_role;

CREATE OR REPLACE FUNCTION public.log_martini_index_event(
  p_kind text,
  p_value text DEFAULT NULL
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

  IF p_kind NOT IN ('view', 'filter', 'generate') THEN
    RAISE EXCEPTION 'Unsupported Martini Index event kind: %', p_kind;
  END IF;

  INSERT INTO public.martini_index_events (user_id, kind, value)
  VALUES (auth.uid(), p_kind, left(nullif(p_value, ''), 64));
END;
$$;

REVOKE ALL ON FUNCTION public.log_martini_index_event(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_martini_index_event(text, text)
  TO authenticated;
