BEGIN;

-- Totals survive account deletion; the deduplication rows do not. Retain only
-- the latest counted opening per member/location, not a browsing-event history.
CREATE TABLE public.location_view_totals (
  location_id bigint PRIMARY KEY REFERENCES public.locations(id) ON DELETE CASCADE,
  view_count bigint NOT NULL DEFAULT 0 CHECK (view_count >= 0)
);

CREATE TABLE public.location_view_receipts (
  location_id bigint NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_counted_at timestamptz NOT NULL,
  PRIMARY KEY (location_id, member_id)
);
CREATE INDEX location_view_receipts_member_idx ON public.location_view_receipts(member_id);

ALTER TABLE public.location_view_totals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_view_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.location_view_totals, public.location_view_receipts
  FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.record_location_view(p_location_id bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_member_id uuid := auth.uid();
  v_counted boolean := false;
  v_total bigint;
BEGIN
  IF v_member_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = v_member_id AND deleted = false
  ) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id) THEN
    RETURN NULL;
  END IF;

  -- The unique key serializes simultaneous opens of the sheet and full page.
  INSERT INTO public.location_view_receipts AS receipt
    (location_id, member_id, last_counted_at)
  VALUES (p_location_id, v_member_id, now())
  ON CONFLICT (location_id, member_id) DO UPDATE
    SET last_counted_at = EXCLUDED.last_counted_at
    WHERE receipt.last_counted_at <= now() - interval '30 minutes'
  RETURNING true INTO v_counted;

  IF COALESCE(v_counted, false) THEN
    INSERT INTO public.location_view_totals AS totals (location_id, view_count)
    VALUES (p_location_id, 1)
    ON CONFLICT (location_id) DO UPDATE SET view_count = totals.view_count + 1
    RETURNING view_count INTO v_total;
  ELSE
    SELECT view_count INTO v_total FROM public.location_view_totals
    WHERE location_id = p_location_id;
  END IF;

  RETURN COALESCE(v_total, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.record_location_view(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_location_view(bigint) TO authenticated;

COMMIT;
