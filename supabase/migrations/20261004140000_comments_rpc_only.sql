-- Members could INSERT comments directly, bypassing create_comment_v2's checks
-- (1-500 characters, published review, no block between commenter and
-- author). The app has created comments only through create_comment_v2 since
-- 4.5.0; builds before that can no longer post comments.

BEGIN;

DROP POLICY IF EXISTS "Users can insert their own comments" ON public.comments;

-- Members keep SELECT and DELETE (deleting their own comments, via RLS).
REVOKE INSERT, UPDATE, TRUNCATE, REFERENCES, TRIGGER
  ON public.comments FROM anon, authenticated;

-- Mirror create_comment_v2's length rule in the table itself.
ALTER TABLE public.comments
  ADD CONSTRAINT comments_body_length_check
  CHECK (btrim(body) <> '' AND char_length(body) <= 500);

COMMIT;
