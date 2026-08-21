BEGIN;

DROP POLICY IF EXISTS "Review images require a member session"
ON storage.objects;

-- A restrictive policy is ANDed with every applicable permissive policy. This
-- guarantees that an anon-key request cannot read private review media even if
-- an environment still contains an unknown legacy SELECT allow rule.
CREATE POLICY "Review images require a member session"
ON storage.objects
AS RESTRICTIVE
FOR SELECT
TO public
USING (
  bucket_id <> 'review_images'
  OR (SELECT auth.role()) = 'authenticated'
);

COMMIT;
