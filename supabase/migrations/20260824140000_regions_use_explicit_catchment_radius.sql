-- A region needs a center and an explicit catchment radius. The old viewport
-- rectangle was only a presentation hint and made geographic membership
-- harder to understand and edit.

BEGIN;

ALTER TABLE public.regions
  ADD COLUMN IF NOT EXISTS catchment_radius_m double precision;

-- Preserve the existing behavior while converting the old viewport-derived
-- circle into the new explicit radius.
UPDATE public.regions AS region
SET catchment_radius_m = GREATEST(
  gis.st_distance(
    gis.st_setsrid(gis.st_makepoint(region.center_lon, region.center_lat), 4326)::gis.geography,
    gis.st_setsrid(gis.st_makepoint(region.viewport_ne_lon, region.viewport_ne_lat), 4326)::gis.geography
  ),
  gis.st_distance(
    gis.st_setsrid(gis.st_makepoint(region.center_lon, region.center_lat), 4326)::gis.geography,
    gis.st_setsrid(gis.st_makepoint(region.viewport_sw_lon, region.viewport_ne_lat), 4326)::gis.geography
  ),
  gis.st_distance(
    gis.st_setsrid(gis.st_makepoint(region.center_lon, region.center_lat), 4326)::gis.geography,
    gis.st_setsrid(gis.st_makepoint(region.viewport_ne_lon, region.viewport_sw_lat), 4326)::gis.geography
  ),
  gis.st_distance(
    gis.st_setsrid(gis.st_makepoint(region.center_lon, region.center_lat), 4326)::gis.geography,
    gis.st_setsrid(gis.st_makepoint(region.viewport_sw_lon, region.viewport_sw_lat), 4326)::gis.geography
  )
)
WHERE region.catchment_radius_m IS NULL;

ALTER TABLE public.regions
  ALTER COLUMN catchment_radius_m SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.regions'::regclass
      AND conname = 'regions_catchment_radius_check'
  ) THEN
    ALTER TABLE public.regions
      ADD CONSTRAINT regions_catchment_radius_check
      CHECK (catchment_radius_m > 0 AND catchment_radius_m <= 500000);
  END IF;
END;
$$;

DROP TRIGGER IF EXISTS regions_refresh_location_assignments
  ON public.regions;

-- These return-table signatures change when viewport columns are removed.
DROP FUNCTION IF EXISTS public.get_enabled_regions();
DROP FUNCTION IF EXISTS public.resolve_region_for_google_place(text);

CREATE OR REPLACE FUNCTION public.region_catchment_radius_m(
  p_region_id bigint
)
RETURNS double precision
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, gis, pg_temp
AS $$
  SELECT region.catchment_radius_m
  FROM public.regions region
  WHERE region.id = p_region_id;
$$;

CREATE OR REPLACE FUNCTION public.resolve_region_id_for_location(
  p_location gis.geography
)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, gis, pg_temp
AS $$
  SELECT region.id
  FROM public.regions region
  CROSS JOIN LATERAL (
    SELECT gis.st_setsrid(
      gis.st_makepoint(region.center_lon, region.center_lat),
      4326
    )::gis.geography AS center_point
  ) center
  WHERE p_location IS NOT NULL
    AND gis.st_dwithin(
      p_location,
      center.center_point,
      region.catchment_radius_m
    )
  ORDER BY
    gis.st_distance(p_location, center.center_point),
    region.display_order,
    region.id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.refresh_location_region_assignments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, gis, pg_temp
AS $$
BEGIN
  UPDATE public.locations AS location
  SET region_id = public.resolve_region_id_for_location(location.location)
  WHERE location.region_id IS DISTINCT FROM
    public.resolve_region_id_for_location(location.location);
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_enabled_regions()
RETURNS TABLE (
  id bigint,
  slug text,
  name text,
  display_order integer,
  center_lat double precision,
  center_lon double precision,
  catchment_radius_m double precision
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.id, r.slug, r.name, r.display_order,
    r.center_lat, r.center_lon, r.catchment_radius_m
  FROM public.regions r
  WHERE r.enabled = true
  ORDER BY r.display_order, r.name, r.id;
$$;

CREATE OR REPLACE FUNCTION public.resolve_region_for_google_place(p_place_id text)
RETURNS TABLE (
  id bigint,
  slug text,
  name text,
  display_order integer,
  center_lat double precision,
  center_lon double precision,
  catchment_radius_m double precision,
  google_place_id text,
  google_label text
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT r.id, r.slug, r.name, r.display_order,
    r.center_lat, r.center_lon, r.catchment_radius_m,
    mapping.google_place_id, mapping.google_label
  FROM public.region_google_places mapping
  JOIN public.regions r ON r.id = mapping.region_id
  WHERE mapping.google_place_id = trim(p_place_id)
    AND r.enabled = true;
$$;

ALTER TABLE public.regions
  DROP COLUMN IF EXISTS viewport_ne_lat,
  DROP COLUMN IF EXISTS viewport_ne_lon,
  DROP COLUMN IF EXISTS viewport_sw_lat,
  DROP COLUMN IF EXISTS viewport_sw_lon;

CREATE TRIGGER regions_refresh_location_assignments
  AFTER INSERT OR UPDATE OF enabled, center_lat, center_lon, catchment_radius_m
  ON public.regions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refresh_location_region_assignments();

-- Re-evaluate assignments against the explicit radius after the conversion.
UPDATE public.locations AS location
SET region_id = public.resolve_region_id_for_location(location.location)
WHERE location.region_id IS DISTINCT FROM
  public.resolve_region_id_for_location(location.location);

REVOKE ALL ON FUNCTION public.get_enabled_regions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_region_for_google_place(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_enabled_regions()
  TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.resolve_region_for_google_place(text)
  TO anon, authenticated, service_role;

COMMIT;
