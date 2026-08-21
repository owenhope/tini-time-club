BEGIN;

-- Remove any remaining anonymous SELECT policy except the intentional public
-- avatar read. This catches old broad policies whose expression is simply TRUE
-- without touching authenticated writes or policies owned by other features.
DO $$
DECLARE
  legacy_policy record;
BEGIN
  FOR legacy_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND policyname <> 'Public can read avatars'
      AND (
        'public'::name = ANY (roles)
        OR 'anon'::name = ANY (roles)
      )
  LOOP
    EXECUTE format(
      'DROP POLICY %I ON storage.objects',
      legacy_policy.policyname
    );
  END LOOP;
END;
$$;

COMMIT;
