-- locations_in_view built one geography envelope from the map bounds. Its
-- edges run the short way around the globe, so a zoomed-out map broke it:
-- a 180°-wide view raised "Antipodal (180 degrees long) edge detected!", a
-- wider one flipped to the far side of the world and returned nothing, and
-- bounds on or past a pole returned nothing. App builds before 4.9.2 send
-- those bounds as-is.
--
-- The area is now clamped to ±85° latitude (the map never draws further),
-- wrapped across the antimeridian, and cut into slices of at most 90°
-- longitude, collected into one geography so the GiST index on
-- locations.location still serves the intersection. A city-sized view
-- builds the same single envelope as before. Signature, result shape and
-- grants are unchanged.

CREATE OR REPLACE FUNCTION public.locations_in_view(
  min_lat double precision,
  min_long double precision,
  max_lat double precision,
  max_long double precision
)
RETURNS TABLE(
  id bigint,
  name text,
  address text,
  lat double precision,
  long double precision,
  rating double precision,
  taste_avg double precision,
  presentation_avg double precision,
  total_ratings integer
)
LANGUAGE sql
STABLE
SET search_path = 'public', 'gis'
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
    count(r.id)::integer AS total_ratings
  FROM public.locations AS l
  JOIN public.reviews AS r
    ON r.location = l.id
   AND r.state = 1
  WHERE gis.st_intersects(l.location, (SELECT geog FROM area))
  GROUP BY l.id, l.name, l.address, l.location;
$$;
