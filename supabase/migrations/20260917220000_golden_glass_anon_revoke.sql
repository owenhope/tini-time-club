BEGIN;

-- The Golden Glass migration revoked only PUBLIC, but this schema's default
-- privileges grant anon and authenticated EXECUTE on new functions, so a
-- fresh database still let anon call the member interface. Hosted projects
-- were corrected out-of-band; this records the fix in migrations.

REVOKE ALL ON FUNCTION public.get_golden_glass_v1(bigint) FROM anon;

COMMIT;
