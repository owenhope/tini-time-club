BEGIN;

CREATE OR REPLACE FUNCTION public.activity_supported_notification(
  p_kind text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_kind IN (
    'user_followed', 'review_liked', 'comment_liked',
    'review_commented', 'comment_replied', 'admin_message'
  );
$$;

CREATE OR REPLACE FUNCTION public.withdraw_activity_for_users(
  p_left_id uuid,
  p_right_id uuid,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
  SELECT n.id, n.user_id, p_reason
  FROM public.notifications n
  WHERE n.kind IN (
    'user_followed', 'review_liked', 'comment_liked',
    'review_commented', 'comment_replied'
  )
    AND ((n.user_id = p_left_id AND n.actor_id = p_right_id)
      OR (n.user_id = p_right_id AND n.actor_id = p_left_id))
  ON CONFLICT (notification_id) DO UPDATE
  SET reason = EXCLUDED.reason, withdrawn_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_comment_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
  SELECT n.id, n.user_id, 'source_deleted'
  FROM public.notifications n
  WHERE n.kind IN ('review_commented', 'comment_replied', 'comment_liked')
    AND n.data->>'commentId' = OLD.id::text
  ON CONFLICT (notification_id) DO UPDATE
  SET reason = EXCLUDED.reason, withdrawn_at = now();
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_comment_like_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.withdraw_activity_for_event(
    concat(
      'comment-like:', OLD.comment_id, ':', OLD.user_id, ':', OLD.liked_at
    ),
    'action_undone'
  );
  INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
  SELECT n.id, n.user_id, 'action_undone'
  FROM public.notifications n
  WHERE n.kind = 'comment_liked'
    AND n.actor_id = OLD.user_id
    AND n.event_key = concat(
      'comment-like:', OLD.comment_id, ':', OLD.user_id
    )
  ON CONFLICT (notification_id) DO UPDATE
  SET reason = EXCLUDED.reason, withdrawn_at = now();
  RETURN OLD;
END;
$$;

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
    concat(
      'comment-like:', NEW.comment_id, ':', NEW.user_id, ':', NEW.liked_at
    )
  ) ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_review_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.state IS DISTINCT FROM OLD.state AND NEW.state IS DISTINCT FROM 1 THEN
    INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
    SELECT n.id, n.user_id, 'source_deleted'
    FROM public.notifications n
    WHERE n.kind IN (
      'review_liked', 'comment_liked', 'review_commented', 'comment_replied'
    )
      AND n.data->>'reviewId' = NEW.id::text
    ON CONFLICT (notification_id) DO UPDATE
    SET reason = EXCLUDED.reason, withdrawn_at = now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_deleted_review_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
  SELECT n.id, n.user_id, 'source_deleted'
  FROM public.notifications n
  WHERE n.kind IN (
    'review_liked', 'comment_liked', 'review_commented', 'comment_replied'
  )
    AND n.data->>'reviewId' = OLD.id::text
  ON CONFLICT (notification_id) DO UPDATE
  SET reason = EXCLUDED.reason, withdrawn_at = now();
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_deleted_actor_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.deleted IS TRUE AND OLD.deleted IS DISTINCT FROM TRUE THEN
    INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
    SELECT n.id, n.user_id, 'account_deleted'
    FROM public.notifications n
    WHERE n.actor_id = NEW.id
      AND n.kind IN (
        'user_followed', 'review_liked', 'comment_liked',
        'review_commented', 'comment_replied'
      )
    ON CONFLICT (notification_id) DO UPDATE
    SET reason = EXCLUDED.reason, withdrawn_at = now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_comment_like_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_comment_like_notification() FROM PUBLIC;

DROP TRIGGER IF EXISTS withdraw_activity_on_comment_like_delete
  ON public.comment_likes;
CREATE TRIGGER withdraw_activity_on_comment_like_delete
AFTER DELETE ON public.comment_likes
FOR EACH ROW EXECUTE FUNCTION public.withdraw_comment_like_activity();

COMMIT;
