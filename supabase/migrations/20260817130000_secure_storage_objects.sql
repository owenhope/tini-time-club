BEGIN;

-- Bucket visibility is part of the security boundary. Avatars are intentionally
-- public; review photos are delivered through short-lived signed URLs.
UPDATE storage.buckets SET public = true WHERE id = 'avatars';
UPDATE storage.buckets SET public = false WHERE id = 'review_images';

DROP POLICY IF EXISTS "read review images f3q3wf_0" ON storage.objects;
DROP POLICY IF EXISTS "review images" ON storage.objects;
DROP POLICY IF EXISTS "user avatars 1oj01fe_0" ON storage.objects;
DROP POLICY IF EXISTS "user avatars 1oj01fe_1" ON storage.objects;
DROP POLICY IF EXISTS "user avatars 1oj01fe_2" ON storage.objects;

-- Avatars are public profile media, but only their authenticated owner may
-- create or mutate objects inside that owner's UUID folder.
CREATE POLICY "Public can read avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

CREATE POLICY "Members can upload their own avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Members can update their own avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'avatars'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Members can delete their own avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

-- Review photos remain private at rest. Signed URLs require SELECT permission,
-- so every signed-in member can read published feed media while anonymous
-- callers cannot access the underlying objects.
CREATE POLICY "Members can read review images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'review_images');

CREATE POLICY "Members can upload their own review images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'review_images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Members can update their own review images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'review_images'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
)
WITH CHECK (
  bucket_id = 'review_images'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

CREATE POLICY "Members can delete their own review images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'review_images'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
);

COMMIT;
