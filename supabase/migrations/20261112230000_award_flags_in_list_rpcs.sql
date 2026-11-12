BEGIN;

-- Four list RPCs left the Golden Glass and verified-location flags out, so
-- the app followed each of them with a second request to location_ratings
-- before it could draw the list. Return the flags with the rows instead.
-- Existing clients ignore the extra fields; clients that look for them skip
-- the follow-up request.
--
-- Adding a column to a RETURNS TABLE function changes its return type, which
-- CREATE OR REPLACE cannot do, so those three are dropped and recreated in
-- this transaction with their previous privileges restored explicitly.

-- Discover places list (jsonb): flags are added to the visible page only.
CREATE OR REPLACE FUNCTION public.get_discover_locations_page_v1(p_limit integer DEFAULT 25, p_query text DEFAULT NULL::text, p_cursor jsonb DEFAULT NULL::jsonb, p_latitude double precision DEFAULT NULL::double precision, p_longitude double precision DEFAULT NULL::double precision, p_radius_km double precision DEFAULT NULL::double precision)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'gis', 'pg_temp'
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
          (
            to_jsonb(visible)
              - 'ordinal'
              - 'primary_rank'
              - 'secondary_rank'
              - 'tertiary_rank'
          ) || jsonb_build_object(
            'is_golden_glass', public.is_golden_glass_location(visible.id),
            'is_location_verified', public.is_location_verified(visible.id)
          )
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

-- Golden Glass list.
DROP FUNCTION public.get_golden_glass_v1(bigint);
CREATE FUNCTION public.get_golden_glass_v1(p_region_id bigint)
 RETURNS TABLE(region_id bigint, location_id bigint, venue_name text, address text, neighborhood text, raw_overall numeric, distinct_reviewers integer, latest_review_at timestamp with time zone, refreshed_at timestamp with time zone, latest_review_image_url text, is_golden_glass boolean, is_location_verified boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT snapshot.region_id, snapshot.location_id, location.name,
    location.address, location.neighborhood, snapshot.raw_overall,
    snapshot.distinct_reviewers, snapshot.latest_review_at,
    snapshot.refreshed_at, latest_review.image_url,
    true,
    public.is_location_verified(snapshot.location_id)
  FROM public.golden_glass_snapshot snapshot
  JOIN public.regions region
    ON region.id = snapshot.region_id AND region.enabled = true
  JOIN public.locations location ON location.id = snapshot.location_id
  LEFT JOIN LATERAL (
    SELECT review.image_url
    FROM public.reviews review
    JOIN public.profiles reviewer
      ON reviewer.id = review.user_id AND reviewer.deleted = false
    WHERE review.location = location.id AND review.state = 1
    ORDER BY review.inserted_at DESC, review.id DESC
    LIMIT 1
  ) latest_review ON true
  WHERE auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles viewer
      WHERE viewer.id = auth.uid() AND viewer.deleted = false
    )
    AND snapshot.region_id = p_region_id
  ORDER BY snapshot.rank;
$$;

REVOKE ALL ON FUNCTION public.get_golden_glass_v1(bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_golden_glass_v1(bigint)
  TO authenticated, service_role;

-- A member's regular places.
DROP FUNCTION public.get_profile_regular_places(uuid);
CREATE FUNCTION public.get_profile_regular_places(p_profile_id uuid)
 RETURNS TABLE(location_id bigint, location_name text, location_address text, rank integer, review_count integer, is_golden_glass boolean, is_location_verified boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $$
  SELECT
    l.id AS location_id,
    l.name AS location_name,
    l.address AS location_address,
    membership.rank::integer,
    membership.review_count,
    public.is_golden_glass_location(l.id) AS is_golden_glass,
    public.is_location_verified(l.id) AS is_location_verified
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

REVOKE ALL ON FUNCTION public.get_profile_regular_places(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_profile_regular_places(uuid)
  TO anon, authenticated, service_role;

-- Map pins.
DROP FUNCTION public.locations_in_view(
  double precision, double precision, double precision, double precision
);
CREATE FUNCTION public.locations_in_view(min_lat double precision, min_long double precision, max_lat double precision, max_long double precision)
 RETURNS TABLE(id bigint, name text, address text, lat double precision, long double precision, rating double precision, taste_avg double precision, presentation_avg double precision, total_ratings integer, is_golden_glass boolean, is_location_verified boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'gis'
AS $$
  WITH spec AS (
    SELECT
      greatest(min_lat, -85) AS south,
      least(max_lat, 85) AS north,
      CASE
        WHEN max_long - min_long >= 360 THEN -180
        WHEN min_long >= -180 AND max_long <= 180 THEN min_long
        ELSE min_long - 360 * floor((min_long + 180) / 360)
      END AS west
  ),
  span AS (
    SELECT
      south,
      north,
      west,
      CASE
        WHEN max_long - min_long >= 360 THEN 180
        ELSE west + (max_long - min_long)
      END AS east
    FROM spec
  ),
  ranges AS (
    SELECT s.south, s.north, r.west, r.east
    FROM span AS s
    CROSS JOIN LATERAL (
      VALUES
        (s.west, least(s.east, 180)),
        (-180::double precision, s.east - 360)
    ) AS r(west, east)
    WHERE r.east > r.west
      AND s.north > s.south
  ),
  area AS (
    SELECT gis.st_collect(
      gis.st_makeenvelope(
        r.west + (r.east - r.west) / n.slices * i,
        r.south,
        CASE
          WHEN i = n.slices - 1 THEN r.east
          ELSE r.west + (r.east - r.west) / n.slices * (i + 1)
        END,
        r.north,
        4326
      )
    )::gis.geography AS geog
    FROM ranges AS r
    CROSS JOIN LATERAL (
      SELECT greatest(1, ceil((r.east - r.west) / 90))::integer AS slices
    ) AS n
    CROSS JOIN LATERAL generate_series(0, n.slices - 1) AS i
  )
  SELECT
    l.id,
    l.name,
    l.address,
    gis.st_y(l.location::gis.geometry) AS lat,
    gis.st_x(l.location::gis.geometry) AS long,
    COALESCE(
      round(avg((r.taste + r.presentation)::numeric / 2.0), 1),
      0
    )::double precision AS rating,
    COALESCE(round(avg(r.taste), 1), 0)::double precision AS taste_avg,
    COALESCE(round(avg(r.presentation), 1), 0)::double precision
      AS presentation_avg,
    count(r.id)::integer AS total_ratings,
    public.is_golden_glass_location(l.id) AS is_golden_glass,
    public.is_location_verified(l.id) AS is_location_verified
  FROM public.locations AS l
  JOIN public.reviews AS r
    ON r.location = l.id
   AND r.state = 1
  WHERE gis.st_intersects(l.location, (SELECT geog FROM area))
  GROUP BY l.id, l.name, l.address, l.location;
$$;

GRANT EXECUTE ON FUNCTION public.locations_in_view(
  double precision, double precision, double precision, double precision
) TO PUBLIC, anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;
