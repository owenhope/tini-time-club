BEGIN;

-- Avatar rings rank on Passport points now, but the regulars payloads still
-- only carried the author's review count, so regulars strips computed tiers
-- from the wrong number. Expose passport_points everywhere a regular's
-- profile is embedded.

DROP FUNCTION public.get_regulars_for_locations(bigint[], integer);

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
  profile_review_count integer,
  passport_points integer
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
    p.review_count AS profile_review_count,
    p.passport_points
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

REVOKE ALL ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_discover_locations_page_v1(
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
              'profile_review_count', regular_profile.review_count,
              'passport_points', regular_profile.passport_points
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

COMMIT;
