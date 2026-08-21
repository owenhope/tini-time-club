BEGIN;

SELECT plan(13);

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'avatars'),
  true,
  'Avatar bucket remains public'
);

SELECT is(
  (SELECT public FROM storage.buckets WHERE id = 'review_images'),
  false,
  'Review image bucket is private'
);

SELECT is(
  (SELECT roles FROM pg_policies WHERE policyname = 'Public can read avatars'),
  ARRAY['public']::name[],
  'Anonymous callers can only read avatars'
);

SELECT is(
  (SELECT roles FROM pg_policies WHERE policyname = 'Members can read review images'),
  ARRAY['authenticated']::name[],
  'Only authenticated members can read review images'
);

SELECT ok(
  COALESCE((
    SELECT permissive = 'RESTRICTIVE'
      AND roles = ARRAY['public']::name[]
      AND qual LIKE '%auth.uid()%'
      AND qual LIKE '%IS NOT NULL%'
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Review images require a member session'
  ), false),
  'A restrictive guard requires a signed-in user for review media'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname IN (
        'read review images f3q3wf_0',
        'review images',
        'user avatars 1oj01fe_0',
        'user avatars 1oj01fe_1',
        'user avatars 1oj01fe_2'
      )
  ),
  'Unsafe legacy Storage policies are removed'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
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
        'Members can delete their own review images',
        'Review images require a member session'
      )
  ),
  'No environment-specific legacy policy references either protected bucket'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND permissive = 'PERMISSIVE'
      AND policyname <> 'Public can read avatars'
      AND (
        'public'::name = ANY (roles)
        OR 'anon'::name = ANY (roles)
      )
  ),
  'No additional anonymous Storage read policy remains'
);

SELECT ok(
  COALESCE((
    SELECT with_check LIKE '%foldername(name)%'
      AND with_check LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Members can upload their own avatars'
  ), false),
  'Avatar uploads are restricted to the caller UUID folder'
);

SELECT ok(
  COALESCE((
    SELECT qual LIKE '%owner_id%'
      AND qual LIKE '%foldername(name)%'
      AND qual LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Members can update their own avatars'
  ), false),
  'Cross-account avatar updates are denied'
);

SELECT ok(
  COALESCE((
    SELECT qual LIKE '%owner_id%'
      AND qual LIKE '%foldername(name)%'
      AND qual LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Members can delete their own avatars'
  ), false),
  'Cross-account avatar deletes are denied'
);

SELECT ok(
  COALESCE((
    SELECT with_check LIKE '%foldername(name)%'
      AND with_check LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Members can upload their own review images'
  ), false),
  'Review image uploads are restricted to the caller UUID folder'
);

SELECT ok(
  COALESCE((
    SELECT qual LIKE '%owner_id%'
      AND qual LIKE '%foldername(name)%'
      AND qual LIKE '%auth.uid()%'
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Members can delete their own review images'
  ), false),
  'Cross-account review image deletes are denied'
);

SELECT * FROM finish();
ROLLBACK;
