BEGIN;

-- Receipt writes are intentionally idempotent. Suppress no-op updates so the
-- realtime invalidation channel cannot refresh Activity forever after the
-- screen marks its snapshot seen.
CREATE OR REPLACE FUNCTION public.skip_activity_receipt_noop_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.seen_at IS NOT DISTINCT FROM OLD.seen_at
     AND NEW.read_at IS NOT DISTINCT FROM OLD.read_at THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.skip_activity_receipt_noop_update() FROM PUBLIC;

DROP TRIGGER IF EXISTS activity_receipts_skip_noop_update
  ON public.activity_receipts;
CREATE TRIGGER activity_receipts_skip_noop_update
BEFORE UPDATE ON public.activity_receipts
FOR EACH ROW EXECUTE FUNCTION public.skip_activity_receipt_noop_update();

COMMIT;
