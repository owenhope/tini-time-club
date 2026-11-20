-- Members may rename themselves, but at most once every 3 months.
--
-- The first username chosen in onboarding (from NULL) is free and does not
-- start the clock. Only member-driven renames are limited and stamped; the
-- service role and admin tooling can still correct a username without using
-- up the member's allowance.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username_changed_at timestamptz;

COMMENT ON COLUMN public.profiles.username_changed_at IS
  'When the member last renamed themselves; NULL until their first rename.';

-- SECURITY INVOKER so current_user is the real caller's role.
CREATE OR REPLACE FUNCTION public.enforce_username_change_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  next_allowed timestamptz;
BEGIN
  IF NEW.username IS NOT DISTINCT FROM OLD.username THEN
    RETURN NEW;
  END IF;

  -- Members can never write the stamp themselves (it has no UPDATE grant),
  -- so only member callers need checking here.
  IF current_user <> 'authenticated' THEN
    RETURN NEW;
  END IF;

  IF NEW.username IS NULL OR NEW.username !~ '^[A-Za-z0-9_]{3,20}$' THEN
    RAISE EXCEPTION 'Use 3-20 letters, numbers, and underscores'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.username) = lower(NEW.username)
      AND p.id <> NEW.id
      AND NOT p.deleted
  ) THEN
    RAISE EXCEPTION 'That username is already taken' USING ERRCODE = '23505';
  END IF;

  -- Picking the first username during onboarding is not a rename.
  IF OLD.username IS NULL THEN
    RETURN NEW;
  END IF;

  next_allowed := OLD.username_changed_at + interval '3 months';
  IF next_allowed IS NOT NULL AND now() < next_allowed THEN
    RAISE EXCEPTION 'You can change your username again on %',
      to_char(next_allowed AT TIME ZONE 'UTC', 'FMMonth FMDD, YYYY')
      USING ERRCODE = 'P0001',
            HINT = 'username_change_limit',
            DETAIL = next_allowed::text;
  END IF;

  NEW.username_changed_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_username_change_limit()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS enforce_username_change_limit ON public.profiles;
CREATE TRIGGER enforce_username_change_limit
  BEFORE UPDATE OF username ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_username_change_limit();

COMMIT;
