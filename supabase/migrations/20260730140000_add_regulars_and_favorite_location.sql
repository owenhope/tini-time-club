ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS favorite_location_id bigint;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_favorite_location_id_fkey'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_favorite_location_id_fkey
      FOREIGN KEY (favorite_location_id)
      REFERENCES public.locations (id)
      ON DELETE SET NULL;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS profiles_favorite_location_id_idx
  ON public.profiles (favorite_location_id)
  WHERE favorite_location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS reviews_regulars_rank_idx
  ON public.reviews (location, user_id, inserted_at DESC)
  WHERE state = 1;

COMMENT ON COLUMN public.profiles.favorite_location_id IS
  'The member-selected favorite Tini Time Club location.';

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
  review_count integer
)
LANGUAGE sql
STABLE
SET search_path = 'public'
AS $$
  WITH reviewer_counts AS (
    SELECT
      r.location AS location_id,
      r.user_id AS profile_id,
      count(*)::integer AS review_count,
      max(r.inserted_at) AS latest_review_at
    FROM public.reviews AS r
    JOIN public.profiles AS p
      ON p.id = r.user_id
     AND p.deleted = false
    WHERE r.state = 1
      AND r.location = ANY(p_location_ids)
    GROUP BY r.location, r.user_id
  ),
  ranked AS (
    SELECT
      reviewer_counts.*,
      row_number() OVER (
        PARTITION BY location_id
        ORDER BY review_count DESC, latest_review_at DESC, profile_id
      )::integer AS rank
    FROM reviewer_counts
  )
  SELECT
    ranked.location_id,
    ranked.rank,
    p.id AS profile_id,
    p.username,
    p.avatar_url,
    COALESCE(p.is_verified, false) AS is_verified,
    ranked.review_count
  FROM ranked
  JOIN public.profiles AS p ON p.id = ranked.profile_id
  WHERE ranked.rank <= greatest(1, least(p_limit, 10))
  ORDER BY ranked.location_id, ranked.rank;
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
SET search_path = 'public'
AS $$
  WITH target_locations AS (
    SELECT DISTINCT r.location
    FROM public.reviews AS r
    WHERE r.user_id = p_profile_id
      AND r.state = 1
  ),
  reviewer_counts AS (
    SELECT
      r.location AS location_id,
      r.user_id AS profile_id,
      count(*)::integer AS review_count,
      max(r.inserted_at) AS latest_review_at
    FROM public.reviews AS r
    JOIN target_locations AS target ON target.location = r.location
    JOIN public.profiles AS p
      ON p.id = r.user_id
     AND p.deleted = false
    WHERE r.state = 1
    GROUP BY r.location, r.user_id
  ),
  ranked AS (
    SELECT
      reviewer_counts.*,
      row_number() OVER (
        PARTITION BY location_id
        ORDER BY review_count DESC, latest_review_at DESC, profile_id
      )::integer AS rank
    FROM reviewer_counts
  )
  SELECT
    l.id AS location_id,
    l.name AS location_name,
    l.address AS location_address,
    ranked.rank,
    ranked.review_count
  FROM ranked
  JOIN public.locations AS l ON l.id = ranked.location_id
  WHERE ranked.profile_id = p_profile_id
    AND ranked.rank <= 3
  ORDER BY ranked.rank, ranked.review_count DESC, l.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_regular_places(uuid)
  TO anon, authenticated;
