BEGIN;

-- Catalog names render verbatim across the app, so enforce first-letter
-- capitalization at write time. Only the first character is touched
-- ("50/50" passes through unchanged), matching the one-time cleanup in
-- 20260906130000_capitalize_catalog_names.sql.
CREATE OR REPLACE FUNCTION public.capitalize_catalog_name()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.name IS NOT NULL THEN
    NEW.name := upper(left(NEW.name, 1)) || right(NEW.name, -1);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER capitalize_name
  BEFORE INSERT OR UPDATE OF name ON public.types
  FOR EACH ROW EXECUTE FUNCTION public.capitalize_catalog_name();

CREATE TRIGGER capitalize_name
  BEFORE INSERT OR UPDATE OF name ON public.spirits
  FOR EACH ROW EXECUTE FUNCTION public.capitalize_catalog_name();

COMMIT;
