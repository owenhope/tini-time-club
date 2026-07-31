-- Complete the avatar-rank data model for environments where the initial
-- review-count migration was already recorded.

UPDATE public.profiles p
SET review_count = (
  SELECT count(*)::integer
  FROM public.reviews r
  WHERE r.user_id = p.id
    AND r.state = 1
);

CREATE OR REPLACE FUNCTION public.protect_profile_review_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.review_count IS DISTINCT FROM OLD.review_count
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Review counts are maintained by review activity';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_review_count ON public.profiles;
CREATE TRIGGER protect_profile_review_count
BEFORE UPDATE OF review_count ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_review_count();

DROP FUNCTION IF EXISTS public.get_regulars_for_locations(bigint[], integer);

CREATE FUNCTION public.get_regulars_for_locations(
  p_location_ids bigint[],
  p_limit integer DEFAULT 3
)
RETURNS TABLE(
  location_id bigint,
  rank integer,
  profile_id uuid,
  username text,
  avatar_url text,
  is_verified boolean,
  review_count integer,
  profile_review_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    membership.location_id,
    membership.rank::integer,
    p.id AS profile_id,
    p.username,
    p.avatar_url,
    COALESCE(p.is_verified, false) AS is_verified,
    membership.review_count,
    p.review_count AS profile_review_count
  FROM public.regular_memberships AS membership
  JOIN public.profiles AS p
    ON p.id = membership.profile_id
   AND p.deleted = false
  WHERE membership.location_id = ANY(p_location_ids)
    AND membership.rank <= greatest(1, least(COALESCE(p_limit, 3), 3))
  ORDER BY membership.location_id, membership.rank;
$$;

REVOKE ALL ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  TO anon, authenticated;

NOTIFY pgrst, 'reload schema';
