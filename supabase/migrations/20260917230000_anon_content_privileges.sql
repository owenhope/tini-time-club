BEGIN;

-- The visitor-content contract (supabase/tests/public_visitor_content.test.sql)
-- says anonymous clients cannot address raw content tables at all: visitors go
-- through the public-content edge function. RLS has returned zero rows to anon
-- since the 2026-07-28 tighten_rls pass, but the table privileges and two
-- legacy public-role policies were never cleaned up in migrations. No behavior
-- changes: the policies' USING clauses already require an authenticated
-- context, and anon selects only ever produced empty results.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'profiles'
      AND policyname = 'Allow public read of profiles'
  ) THEN
    ALTER POLICY "Allow public read of profiles" ON public.profiles
      TO authenticated;
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'reviews'
      AND policyname = 'Individuals can view their own reviews. '
  ) THEN
    ALTER POLICY "Individuals can view their own reviews. " ON public.reviews
      TO authenticated;
  END IF;
END;
$$;

REVOKE ALL ON public.profiles, public.reviews, public.comments FROM anon;

-- Business inquiries are operator-only; the server writes through the
-- service-role RPC.
REVOKE ALL ON public.business_inquiries FROM anon, authenticated;

NOTIFY pgrst, 'reload schema';
COMMIT;
