-- Show how many members have liked each place in the admin Places list, and
-- let it sort by that. Adds favorites_count to each row and a 'favorites' sort;
-- the signature and every other column are unchanged from
-- 20260828100000_location_claims_verification_managers, so an admin build that
-- doesn't know the new field keeps working.

CREATE OR REPLACE FUNCTION public.get_admin_locations_page(
  p_search text DEFAULT NULL,
  p_min_reviews integer DEFAULT 0,
  p_sort text DEFAULT 'place',
  p_direction text DEFAULT 'asc',
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  WITH params AS (
    SELECT NULLIF(btrim(p_search), '') AS search_text,
      greatest(0, COALESCE(p_min_reviews, 0)) AS min_reviews,
      CASE WHEN p_sort IN ('place', 'area', 'rating', 'reviews', 'favorites') THEN p_sort ELSE 'place' END AS sort_column,
      CASE WHEN lower(p_direction) = 'desc' THEN 'desc' ELSE 'asc' END AS sort_direction,
      greatest(1, COALESCE(p_page, 1)) AS page_value,
      greatest(1, least(COALESCE(p_per_page, 50), 100)) AS per_page_value
  ), location_rows AS (
    SELECT location.id, location.name, location.address,
      location.neighborhood, location.region_id,
      location.golden_glass_eligible, location.golden_glass_ineligibility_reason,
      ratings.rating, COALESCE(ratings.total_ratings, 0) AS total_ratings,
      COALESCE(ratings.is_location_verified, false) AS is_location_verified,
      COALESCE(favorites.favorites_count, 0) AS favorites_count
    FROM public.locations location
    LEFT JOIN public.location_ratings ratings ON ratings.id = location.id
    LEFT JOIN (
      SELECT location_id, count(*)::integer AS favorites_count
      FROM public.location_favorites
      GROUP BY location_id
    ) favorites ON favorites.location_id = location.id
    CROSS JOIN params
    WHERE (params.search_text IS NULL
      OR location.name ILIKE '%' || params.search_text || '%'
      OR location.address ILIKE '%' || params.search_text || '%')
      AND COALESCE(ratings.total_ratings, 0) >= params.min_reviews
  ), paged AS (
    SELECT location_rows.* FROM location_rows CROSS JOIN params
    ORDER BY
      CASE WHEN params.sort_column = 'place' AND params.sort_direction = 'asc' THEN name END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'place' AND params.sort_direction = 'desc' THEN name END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'area' AND params.sort_direction = 'asc' THEN address END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'area' AND params.sort_direction = 'desc' THEN address END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'rating' AND params.sort_direction = 'asc' THEN rating END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'rating' AND params.sort_direction = 'desc' THEN rating END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'reviews' AND params.sort_direction = 'asc' THEN total_ratings END ASC,
      CASE WHEN params.sort_column = 'reviews' AND params.sort_direction = 'desc' THEN total_ratings END DESC,
      CASE WHEN params.sort_column = 'favorites' AND params.sort_direction = 'asc' THEN favorites_count END ASC,
      CASE WHEN params.sort_column = 'favorites' AND params.sort_direction = 'desc' THEN favorites_count END DESC,
      name ASC NULLS LAST, id ASC
    LIMIT (SELECT per_page_value FROM params)
    OFFSET ((SELECT page_value FROM params) - 1) * (SELECT per_page_value FROM params)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM location_rows),
    'locations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'address', address, 'neighborhood', neighborhood,
      'region_id', region_id, 'golden_glass_eligible', golden_glass_eligible,
      'golden_glass_ineligibility_reason', golden_glass_ineligibility_reason,
      'rating', rating, 'total_ratings', total_ratings,
      'is_location_verified', is_location_verified,
      'favorites_count', favorites_count
    )) FROM paged), '[]'::jsonb)
  );
$$;
