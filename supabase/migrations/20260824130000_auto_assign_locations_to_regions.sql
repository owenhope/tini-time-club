-- Region membership is geographic, not an operator-maintained lookup.
-- A location is assigned to the nearest configured region whose derived
-- catchment contains its coordinates. The viewport remains map presentation
-- data; its circumscribing circle is the automatic matching area.

BEGIN;

CREATE OR REPLACE FUNCTION public.region_catchment_radius_m(
  p_region_id bigint
)
RETURNS double precision
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, gis, pg_temp
AS $$
  SELECT GREATEST(
    gis.st_distance(center_point, north_east_point),
    gis.st_distance(center_point, north_west_point),
    gis.st_distance(center_point, south_east_point),
    gis.st_distance(center_point, south_west_point)
  )
  FROM public.regions region
  CROSS JOIN LATERAL (
    SELECT gis.st_setsrid(
      gis.st_makepoint(region.center_lon, region.center_lat),
      4326
    )::gis.geography AS center_point,
    gis.st_setsrid(
      gis.st_makepoint(region.viewport_ne_lon, region.viewport_ne_lat),
      4326
    )::gis.geography AS north_east_point,
    gis.st_setsrid(
      gis.st_makepoint(region.viewport_sw_lon, region.viewport_ne_lat),
      4326
    )::gis.geography AS north_west_point,
    gis.st_setsrid(
      gis.st_makepoint(region.viewport_ne_lon, region.viewport_sw_lat),
      4326
    )::gis.geography AS south_east_point,
    gis.st_setsrid(
      gis.st_makepoint(region.viewport_sw_lon, region.viewport_sw_lat),
      4326
    )::gis.geography AS south_west_point
  ) points
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
      public.region_catchment_radius_m(region.id)
    )
  ORDER BY
    gis.st_distance(p_location, center.center_point),
    region.display_order,
    region.id
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.auto_assign_location_region()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, gis, pg_temp
AS $$
BEGIN
  NEW.region_id := public.resolve_region_id_for_location(NEW.location);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS locations_auto_assign_region
  ON public.locations;
CREATE TRIGGER locations_auto_assign_region
  BEFORE INSERT OR UPDATE OF location, region_id
  ON public.locations
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_location_region();

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

DROP TRIGGER IF EXISTS regions_refresh_location_assignments
  ON public.regions;
CREATE TRIGGER regions_refresh_location_assignments
  AFTER INSERT OR UPDATE OF enabled, center_lat, center_lon,
    viewport_ne_lat, viewport_ne_lon, viewport_sw_lat, viewport_sw_lon
  ON public.regions
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.refresh_location_region_assignments();

-- Backfill existing locations as part of the rollout. The trigger keeps this
-- assignment current for new locations and future region-bound changes.
UPDATE public.locations AS location
SET region_id = public.resolve_region_id_for_location(location.location)
WHERE location.region_id IS DISTINCT FROM
  public.resolve_region_id_for_location(location.location);

REVOKE ALL ON FUNCTION public.region_catchment_radius_m(bigint) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.resolve_region_id_for_location(gis.geography) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.auto_assign_location_region() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.refresh_location_region_assignments() FROM PUBLIC;

COMMIT;
