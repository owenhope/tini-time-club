DROP INDEX IF EXISTS public.locations_place_id_unique_idx;

-- PostgreSQL unique indexes allow multiple NULL values by default. Keeping
-- this index non-partial lets PostgREST infer it for ON CONFLICT (place_id).
CREATE UNIQUE INDEX locations_place_id_unique_idx
  ON public.locations (place_id);

NOTIFY pgrst, 'reload schema';
