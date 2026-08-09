BEGIN;

CREATE TABLE IF NOT EXISTS public.comment_likes (
  comment_id integer NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  liked_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (comment_id, user_id)
);

CREATE INDEX IF NOT EXISTS comment_likes_user_id_idx
  ON public.comment_likes (user_id);
CREATE INDEX IF NOT EXISTS comment_likes_liked_at_idx
  ON public.comment_likes (liked_at DESC);

ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.comment_likes FROM anon, authenticated;
GRANT SELECT, INSERT, DELETE ON TABLE public.comment_likes TO authenticated;
GRANT ALL ON TABLE public.comment_likes TO service_role;

CREATE POLICY "Authenticated users can read comment likes"
  ON public.comment_likes FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can like as themselves"
  ON public.comment_likes FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can remove their own comment likes"
  ON public.comment_likes FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_review_comments(p_review_id bigint)
RETURNS TABLE (
  id integer,
  user_id uuid,
  review_id integer,
  body text,
  inserted_at timestamptz,
  likes_count bigint,
  has_liked boolean,
  profile jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT
    c.id,
    c.user_id,
    c.review_id,
    c.body,
    c.inserted_at,
    (
      SELECT count(*)
      FROM public.comment_likes cl
      WHERE cl.comment_id = c.id
    ) AS likes_count,
    EXISTS (
      SELECT 1
      FROM public.comment_likes cl
      WHERE cl.comment_id = c.id
        AND cl.user_id = auth.uid()
    ) AS has_liked,
    jsonb_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified', p.is_verified,
      'review_count', p.review_count
    ) AS profile
  FROM public.comments c
  JOIN public.profiles p ON p.id = c.user_id
  WHERE c.review_id = p_review_id
    AND p.deleted = false
  ORDER BY c.inserted_at ASC
  LIMIT 200;
$$;

REVOKE ALL ON FUNCTION public.get_review_comments(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_review_comments(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.enqueue_comment_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner_id uuid;
  v_actor_name text;
  v_review_id integer;
BEGIN
  SELECT c.user_id, c.review_id
  INTO v_owner_id, v_review_id
  FROM public.comments c
  WHERE c.id = NEW.comment_id;

  IF v_owner_id IS NULL OR v_owner_id = NEW.user_id OR
     public.push_users_are_blocked(NEW.user_id, v_owner_id) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(username, 'Someone') INTO v_actor_name
  FROM public.profiles WHERE id = NEW.user_id;

  INSERT INTO public.notifications (
    user_id, actor_id, body, type, kind, data, event_key
  ) VALUES (
    v_owner_id,
    NEW.user_id,
    concat(v_actor_name, ' liked your comment.'),
    2,
    'comment_liked',
    jsonb_build_object(
      'kind', 'comment_liked',
      'reviewId', v_review_id,
      'commentId', NEW.comment_id,
      'url', concat('/r/', v_review_id, '?comments=1')
    ),
    concat('comment-like:', NEW.comment_id, ':', NEW.user_id)
  ) ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_comment_like_notification() FROM PUBLIC;

DROP TRIGGER IF EXISTS notify_on_comment_like_insert ON public.comment_likes;
CREATE TRIGGER notify_on_comment_like_insert
AFTER INSERT ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.enqueue_comment_like_notification();

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS comment_id integer,
  ADD COLUMN IF NOT EXISTS content_type text NOT NULL DEFAULT 'review',
  ADD COLUMN IF NOT EXISTS content_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.reports
  DROP CONSTRAINT IF EXISTS reports_review_id_fkey;
ALTER TABLE public.reports
  ADD CONSTRAINT reports_review_id_fkey
  FOREIGN KEY (review_id) REFERENCES public.reviews(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_comment_id_fkey'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_comment_id_fkey
      FOREIGN KEY (comment_id) REFERENCES public.comments(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reports_content_type_check'
  ) THEN
    ALTER TABLE public.reports
      ADD CONSTRAINT reports_content_type_check
      CHECK (content_type IN ('review', 'comment'));
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS reports_comment_id_idx
  ON public.reports (comment_id);
CREATE INDEX IF NOT EXISTS reports_content_type_idx
  ON public.reports (content_type);
CREATE UNIQUE INDEX IF NOT EXISTS reports_reporter_comment_unique_idx
  ON public.reports (reporter_id, comment_id)
  WHERE comment_id IS NOT NULL;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.reports FROM anon, authenticated;
GRANT INSERT ON TABLE public.reports TO authenticated;
GRANT ALL ON TABLE public.reports TO service_role;

DROP POLICY IF EXISTS "Users can submit review reports" ON public.reports;
CREATE POLICY "Users can submit review reports"
  ON public.reports FOR INSERT TO authenticated
  WITH CHECK (
    reporter_id = auth.uid()
    AND content_type = 'review'
    AND comment_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM public.reviews r
      WHERE r.id = review_id
        AND r.user_id = creator_id
    )
  );

CREATE OR REPLACE FUNCTION public.report_comment(
  p_comment_id integer,
  p_reason text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reporter_id uuid := auth.uid();
  v_comment public.comments%ROWTYPE;
  v_username text;
  v_inserted integer;
  v_reason text := left(trim(coalesce(p_reason, '')), 500);
BEGIN
  IF v_reporter_id IS NULL THEN
    RETURN 'unauthenticated';
  END IF;
  IF v_reason = '' THEN
    RETURN 'invalid_reason';
  END IF;

  SELECT * INTO v_comment
  FROM public.comments
  WHERE id = p_comment_id;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF v_comment.user_id = v_reporter_id THEN
    RETURN 'own_comment';
  END IF;

  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = v_comment.user_id;

  INSERT INTO public.reports (
    reporter_id,
    review_id,
    comment_id,
    creator_id,
    reason,
    content_type,
    content_snapshot
  ) VALUES (
    v_reporter_id,
    v_comment.review_id,
    v_comment.id,
    v_comment.user_id,
    v_reason,
    'comment',
    jsonb_build_object(
      'body', v_comment.body,
      'username', v_username,
      'commentId', v_comment.id,
      'reviewId', v_comment.review_id
    )
  )
  ON CONFLICT (reporter_id, comment_id)
    WHERE comment_id IS NOT NULL
  DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN CASE WHEN v_inserted = 1 THEN 'created' ELSE 'duplicate' END;
END;
$$;

REVOKE ALL ON FUNCTION public.report_comment(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_comment(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.report_review(
  p_review_id bigint,
  p_reason text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_reporter_id uuid := auth.uid();
  v_review public.reviews%ROWTYPE;
  v_username text;
  v_location_name text;
  v_reason text := left(trim(coalesce(p_reason, '')), 500);
BEGIN
  IF v_reporter_id IS NULL THEN
    RETURN 'unauthenticated';
  END IF;
  IF v_reason = '' THEN
    RETURN 'invalid_reason';
  END IF;

  SELECT * INTO v_review
  FROM public.reviews
  WHERE id = p_review_id
    AND state = 1;

  IF NOT FOUND THEN
    RETURN 'not_found';
  END IF;
  IF v_review.user_id = v_reporter_id THEN
    RETURN 'own_review';
  END IF;

  SELECT username INTO v_username
  FROM public.profiles
  WHERE id = v_review.user_id;

  SELECT name INTO v_location_name
  FROM public.locations
  WHERE id = v_review.location;

  INSERT INTO public.reports (
    reporter_id,
    review_id,
    creator_id,
    reason,
    content_type,
    content_snapshot
  ) VALUES (
    v_reporter_id,
    v_review.id,
    v_review.user_id,
    v_reason,
    'review',
    jsonb_build_object(
      'caption', v_review.comment,
      'imageUrl', v_review.image_url,
      'username', v_username,
      'reviewId', v_review.id,
      'locationName', v_location_name
    )
  );

  RETURN 'created';
END;
$$;

REVOKE ALL ON FUNCTION public.report_review(bigint, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_review(bigint, text) TO authenticated;

COMMIT;
