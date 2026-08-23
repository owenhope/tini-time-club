-- Cursor-based discovery pages. The offset RPCs remain available for released
-- clients, while these versioned functions avoid page drift and large offsets.

BEGIN;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS follower_count integer NOT NULL DEFAULT 0;

UPDATE public.profiles profile
SET follower_count = (
  SELECT count(*)::integer
  FROM public.followers follower
  WHERE follower.following_id = profile.id
);

CREATE OR REPLACE FUNCTION public.protect_profile_follower_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.follower_count IS DISTINCT FROM OLD.follower_count
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Follower counts are maintained by follow activity';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_follower_count ON public.profiles;
CREATE TRIGGER protect_profile_follower_count
BEFORE UPDATE OF follower_count ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_follower_count();

CREATE OR REPLACE FUNCTION public.sync_profile_follower_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected uuid[];
  profile_id uuid;
BEGIN
  affected := ARRAY(
    SELECT DISTINCT id
    FROM unnest(ARRAY[
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.following_id END,
      CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN OLD.following_id END
    ]) id
    WHERE id IS NOT NULL
  );

  FOREACH profile_id IN ARRAY affected LOOP
    UPDATE public.profiles
    SET follower_count = (
      SELECT count(*)::integer
      FROM public.followers follower
      WHERE follower.following_id = profile_id
    )
    WHERE id = profile_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_follower_count ON public.followers;
CREATE TRIGGER sync_profile_follower_count
AFTER INSERT OR DELETE OR UPDATE OF following_id ON public.followers
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_follower_count();

CREATE INDEX IF NOT EXISTS profiles_discovery_rank_idx
  ON public.profiles (
    review_count DESC,
    follower_count DESC,
    username ASC,
    id ASC
  )
  WHERE deleted = false AND username IS NOT NULL;

CREATE FUNCTION public.get_discover_profiles_page_v1(
  p_limit integer DEFAULT 25,
  p_search text DEFAULT NULL,
  p_cursor jsonb DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH request AS (
    SELECT greatest(1, least(COALESCE(p_limit, 25), 50)) AS page_size
  ),
  ranked AS (
    SELECT
      profile.id,
      profile.username,
      profile.avatar_url,
      profile.is_verified,
      profile.follower_count,
      profile.review_count
    FROM public.profiles profile
    WHERE profile.deleted = false
      AND profile.username IS NOT NULL
      AND (
        NULLIF(trim(p_search), '') IS NULL
        OR profile.username ILIKE
          '%' || replace(replace(trim(p_search), '%', '\%'), '_', '\_') || '%'
      )
      AND (
        p_cursor IS NULL
        OR profile.review_count < (p_cursor->>'reviewCount')::integer
        OR (
          profile.review_count = (p_cursor->>'reviewCount')::integer
          AND profile.follower_count < (p_cursor->>'followerCount')::integer
        )
        OR (
          profile.review_count = (p_cursor->>'reviewCount')::integer
          AND profile.follower_count = (p_cursor->>'followerCount')::integer
          AND profile.username > p_cursor->>'username'
        )
        OR (
          profile.review_count = (p_cursor->>'reviewCount')::integer
          AND profile.follower_count = (p_cursor->>'followerCount')::integer
          AND profile.username = p_cursor->>'username'
          AND profile.id > (p_cursor->>'id')::uuid
        )
      )
    ORDER BY
      profile.review_count DESC,
      profile.follower_count DESC,
      profile.username ASC,
      profile.id ASC
    LIMIT (SELECT page_size + 1 FROM request)
  ),
  numbered AS (
    SELECT
      ranked.*,
      row_number() OVER (
        ORDER BY
          ranked.review_count DESC,
          ranked.follower_count DESC,
          ranked.username ASC,
          ranked.id ASC
      ) AS ordinal
    FROM ranked
  ),
  visible AS (
    SELECT numbered.*
    FROM numbered, request
    WHERE numbered.ordinal <= request.page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(visible) - 'ordinal'
          ORDER BY
            visible.review_count DESC,
            visible.follower_count DESC,
            visible.username ASC,
            visible.id ASC
        )
        FROM visible
      ),
      '[]'::jsonb
    ),
    'nextCursor', CASE
      WHEN EXISTS (
        SELECT 1 FROM numbered, request
        WHERE numbered.ordinal > request.page_size
      ) THEN (
        SELECT jsonb_build_object(
          'reviewCount', visible.review_count,
          'followerCount', visible.follower_count,
          'username', visible.username,
          'id', visible.id
        )
        FROM visible
        ORDER BY
          visible.review_count ASC,
          visible.follower_count ASC,
          visible.username DESC,
          visible.id DESC
        LIMIT 1
      )
      ELSE NULL
    END,
    'hasMore', EXISTS (
      SELECT 1 FROM numbered, request
      WHERE numbered.ordinal > request.page_size
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_discover_profiles_page_v1(
  integer,
  text,
  jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discover_profiles_page_v1(
  integer,
  text,
  jsonb
) TO anon, authenticated, service_role;

CREATE FUNCTION public.get_discover_locations_page_v1(
  p_limit integer DEFAULT 25,
  p_query text DEFAULT NULL,
  p_cursor jsonb DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_radius_km double precision DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, gis, pg_temp
AS $$
  WITH request AS (
    SELECT greatest(1, least(COALESCE(p_limit, 25), 50)) AS page_size
  ),
  scored AS (
    SELECT
      ratings.id,
      ratings.name,
      ratings.address,
      ratings.lat,
      ratings.lon,
      ratings.rating,
      ratings.taste_avg,
      ratings.presentation_avg,
      ratings.total_ratings,
      CASE
        WHEN NULLIF(trim(p_query), '') IS NULL THEN ratings.rating
        WHEN ratings.name ILIKE
          '%' || replace(replace(trim(p_query), '%', '\%'), '_', '\_') || '%'
          THEN 1::numeric
        ELSE 0::numeric
      END AS primary_rank,
      CASE
        WHEN NULLIF(trim(p_query), '') IS NULL
          THEN ratings.total_ratings::numeric
        ELSE GREATEST(
          similarity(ratings.name, trim(p_query)),
          similarity(COALESCE(ratings.address, ''), trim(p_query))
        )::numeric
      END AS secondary_rank,
      CASE
        WHEN NULLIF(trim(p_query), '') IS NULL THEN 0::numeric
        ELSE ratings.total_ratings::numeric
      END AS tertiary_rank,
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'location_id', membership.location_id,
              'rank', membership.rank,
              'profile_id', regular_profile.id,
              'username', regular_profile.username,
              'avatar_url', regular_profile.avatar_url,
              'is_verified', regular_profile.is_verified,
              'review_count', membership.review_count,
              'profile_review_count', regular_profile.review_count
            )
            ORDER BY membership.rank
          )
          FROM public.regular_memberships membership
          JOIN public.profiles regular_profile
            ON regular_profile.id = membership.profile_id
           AND regular_profile.deleted = false
          WHERE membership.location_id = ratings.id
            AND membership.rank <= 3
            AND CASE
              WHEN auth.uid() IS NULL
                THEN COALESCE(regular_profile.is_public, false)
              ELSE public.is_member_visible(regular_profile.id)
            END
        ),
        '[]'::jsonb
      ) AS regulars
    FROM public.location_ratings ratings
    JOIN public.locations location ON location.id = ratings.id
    WHERE (
        NULLIF(trim(p_query), '') IS NULL
        AND ratings.total_ratings >= 2
      OR
        NULLIF(trim(p_query), '') IS NOT NULL
        AND length(trim(p_query)) >= 2
        AND (
          ratings.name ILIKE
            '%' || replace(replace(trim(p_query), '%', '\%'), '_', '\_') || '%'
          OR ratings.address ILIKE
            '%' || replace(replace(trim(p_query), '%', '\%'), '_', '\_') || '%'
          OR similarity(ratings.name, trim(p_query)) > 0.25
        )
      )
      AND (
        p_latitude IS NULL
        OR p_longitude IS NULL
        OR p_radius_km IS NULL
        OR gis.st_dwithin(
          location.location,
          gis.st_setsrid(
            gis.st_makepoint(p_longitude, p_latitude),
            4326
          )::gis.geography,
          greatest(0, least(p_radius_km, 500)) * 1000
        )
      )
  ),
  ranked AS (
    SELECT scored.*
    FROM scored
    WHERE p_cursor IS NULL
      OR scored.primary_rank < (p_cursor->>'primary')::numeric
      OR (
        scored.primary_rank = (p_cursor->>'primary')::numeric
        AND scored.secondary_rank < (p_cursor->>'secondary')::numeric
      )
      OR (
        scored.primary_rank = (p_cursor->>'primary')::numeric
        AND scored.secondary_rank = (p_cursor->>'secondary')::numeric
        AND scored.tertiary_rank < (p_cursor->>'tertiary')::numeric
      )
      OR (
        scored.primary_rank = (p_cursor->>'primary')::numeric
        AND scored.secondary_rank = (p_cursor->>'secondary')::numeric
        AND scored.tertiary_rank = (p_cursor->>'tertiary')::numeric
        AND scored.id > (p_cursor->>'id')::bigint
      )
    ORDER BY
      scored.primary_rank DESC,
      scored.secondary_rank DESC,
      scored.tertiary_rank DESC,
      scored.id ASC
    LIMIT (SELECT page_size + 1 FROM request)
  ),
  numbered AS (
    SELECT
      ranked.*,
      row_number() OVER (
        ORDER BY
          ranked.primary_rank DESC,
          ranked.secondary_rank DESC,
          ranked.tertiary_rank DESC,
          ranked.id ASC
      ) AS ordinal
    FROM ranked
  ),
  visible AS (
    SELECT numbered.*
    FROM numbered, request
    WHERE numbered.ordinal <= request.page_size
  )
  SELECT jsonb_build_object(
    'items', COALESCE(
      (
        SELECT jsonb_agg(
          to_jsonb(visible)
            - 'ordinal'
            - 'primary_rank'
            - 'secondary_rank'
            - 'tertiary_rank'
          ORDER BY
            visible.primary_rank DESC,
            visible.secondary_rank DESC,
            visible.tertiary_rank DESC,
            visible.id ASC
        )
        FROM visible
      ),
      '[]'::jsonb
    ),
    'nextCursor', CASE
      WHEN EXISTS (
        SELECT 1 FROM numbered, request
        WHERE numbered.ordinal > request.page_size
      ) THEN (
        SELECT jsonb_build_object(
          'primary', visible.primary_rank,
          'secondary', visible.secondary_rank,
          'tertiary', visible.tertiary_rank,
          'id', visible.id
        )
        FROM visible
        ORDER BY
          visible.primary_rank ASC,
          visible.secondary_rank ASC,
          visible.tertiary_rank ASC,
          visible.id DESC
        LIMIT 1
      )
      ELSE NULL
    END,
    'hasMore', EXISTS (
      SELECT 1 FROM numbered, request
      WHERE numbered.ordinal > request.page_size
    )
  );
$$;

REVOKE ALL ON FUNCTION public.get_discover_locations_page_v1(
  integer,
  text,
  jsonb,
  double precision,
  double precision,
  double precision
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_discover_locations_page_v1(
  integer,
  text,
  jsonb,
  double precision,
  double precision,
  double precision
) TO anon, authenticated, service_role;

COMMIT;
