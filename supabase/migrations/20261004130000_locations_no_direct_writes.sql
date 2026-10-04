-- Members could INSERT locations directly with any name, coordinates and
-- Google place_id. Because resolve_or_create_location / publish_review_v1
-- match on place_id first, a member could claim an unreviewed bar's real
-- place_id with a fake name or position and every later review of that bar
-- would attach to the fake row.
--
-- Location creation goes through SECURITY DEFINER RPCs since app 4.1.0, so
-- members no longer need any direct write privilege. (App builds before
-- 4.1.0 inserted directly; they can no longer add brand-new bars.)

BEGIN;

DROP POLICY IF EXISTS "Individuals can create locations." ON public.locations;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.locations FROM anon, authenticated;

COMMIT;
