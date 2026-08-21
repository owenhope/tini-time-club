BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.profiles.is_public IS
  'Whether this profile and its published reviews may appear to signed-out visitors.';

CREATE INDEX IF NOT EXISTS profiles_public_review_count_idx
  ON public.profiles (review_count DESC, username)
  WHERE is_public = true AND deleted = false;

CREATE OR REPLACE FUNCTION public.get_regulars_for_locations(
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
SET search_path = public, pg_temp
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
    AND (
      (auth.uid() IS NULL AND p.is_public = true)
      OR (auth.uid() IS NOT NULL AND public.is_member_visible(p.id))
    )
  ORDER BY membership.location_id, membership.rank;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_regular_places(
  p_profile_id uuid
)
RETURNS TABLE(
  location_id bigint,
  location_name text,
  location_address text,
  rank integer,
  review_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT
    l.id AS location_id,
    l.name AS location_name,
    l.address AS location_address,
    membership.rank::integer,
    membership.review_count
  FROM public.regular_memberships AS membership
  JOIN public.locations AS l ON l.id = membership.location_id
  WHERE membership.profile_id = p_profile_id
    AND (
      (auth.uid() IS NOT NULL AND public.is_member_visible(p_profile_id))
      OR EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE auth.uid() IS NULL
          AND p.id = p_profile_id
          AND p.is_public = true
          AND p.deleted = false
      )
    )
  ORDER BY membership.rank, membership.review_count DESC, l.name;
$$;

REVOKE ALL ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profile_regular_places(uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_profile_regular_places(uuid)
  TO anon, authenticated, service_role;

COMMIT;
