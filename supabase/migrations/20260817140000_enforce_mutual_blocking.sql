-- Make blocking a database privacy boundary. Client-side filters and optional
-- RPC parameters must not be able to reveal either member's content.

CREATE OR REPLACE FUNCTION public.is_member_visible(p_member_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT auth.uid() IS NOT NULL
    AND p_member_id IS NOT NULL
    AND (
      p_member_id = auth.uid()
      OR NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE (b.blocker_id = auth.uid() AND b.blocked_id = p_member_id)
           OR (b.blocker_id = p_member_id AND b.blocked_id = auth.uid())
      )
    );
$$;

REVOKE ALL ON FUNCTION public.is_member_visible(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_member_visible(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_member_visible(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_member_visible(uuid) TO service_role;

DROP POLICY IF EXISTS "Allow public read of profiles" ON public.profiles;

CREATE POLICY "Members can read mutually unblocked profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_member_visible(id));

DROP POLICY IF EXISTS "Authenticated users can read published reviews"
  ON public.reviews;

CREATE POLICY "Members can read mutually unblocked published reviews"
  ON public.reviews FOR SELECT TO authenticated
  USING (
    state = 1
    AND public.is_member_visible(user_id)
  );

DROP POLICY IF EXISTS "Authenticated users can read comments"
  ON public.comments;

CREATE POLICY "Members can read mutually unblocked comments"
  ON public.comments FOR SELECT TO authenticated
  USING (
    public.is_member_visible(user_id)
    AND EXISTS (
      SELECT 1
      FROM public.reviews r
      WHERE r.id = comments.review_id
        AND public.is_member_visible(r.user_id)
    )
  );
