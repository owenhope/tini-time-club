BEGIN;

DROP POLICY IF EXISTS "Review images require a member session"
ON storage.objects;

-- Storage requests carrying only the public anon key have no user subject.
-- Requiring auth.uid() closes that path while allowing real member sessions.
CREATE POLICY "Review images require a member session"
ON storage.objects
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  bucket_id <> 'review_images'
  OR (SELECT auth.uid()) IS NOT NULL
);

COMMIT;
