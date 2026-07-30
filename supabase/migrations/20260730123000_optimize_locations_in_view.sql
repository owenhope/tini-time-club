CREATE INDEX IF NOT EXISTS reviews_published_location_idx
  ON public.reviews (location)
  WHERE state = 1;

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
  WHERE gis.st_intersects(
    l.location,
    gis.st_makeenvelope(
      min_long,
      min_lat,
      max_long,
      max_lat,
      4326
    )::gis.geography
  )
  GROUP BY l.id, l.name, l.address, l.location;
$$;
