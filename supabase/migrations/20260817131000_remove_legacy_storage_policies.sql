BEGIN;

-- Dashboard-created Storage policies can have environment-specific generated
-- names. Remove any policy that still references these buckets unless it is
-- one of the reviewed policies created by the preceding migration.
DO $$
DECLARE
  legacy_policy record;
BEGIN
  FOR legacy_policy IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        COALESCE(qual, '') LIKE '%avatars%'
        OR COALESCE(with_check, '') LIKE '%avatars%'
        OR COALESCE(qual, '') LIKE '%review_images%'
        OR COALESCE(with_check, '') LIKE '%review_images%'
      )
      AND policyname NOT IN (
        'Public can read avatars',
        'Members can upload their own avatars',
        'Members can update their own avatars',
        'Members can delete their own avatars',
        'Members can read review images',
        'Members can upload their own review images',
        'Members can update their own review images',
        'Members can delete their own review images'
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
