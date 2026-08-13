BEGIN;

-- Activity is a private read projection over the existing notification/push
-- ledger. Receipt state never mutates delivery rows, so push delivery and
-- admin open-rate analytics remain immutable.
CREATE TABLE IF NOT EXISTS public.activity_receipts (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_id uuid NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  seen_at timestamptz,
  read_at timestamptz,
  PRIMARY KEY (user_id, notification_id)
);

CREATE TABLE IF NOT EXISTS public.activity_withdrawals (
  notification_id uuid PRIMARY KEY REFERENCES public.notifications(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  withdrawn_at timestamptz NOT NULL DEFAULT now(),
  reason text NOT NULL CHECK (reason IN (
    'source_deleted', 'action_undone', 'blocked', 'account_deleted'
  ))
);

CREATE INDEX IF NOT EXISTS notifications_activity_recipient_cursor_idx
  ON public.notifications (user_id, created_at DESC, id DESC)
  WHERE type = 2;

CREATE INDEX IF NOT EXISTS activity_receipts_user_seen_idx
  ON public.activity_receipts (user_id, seen_at, notification_id);

CREATE INDEX IF NOT EXISTS activity_withdrawals_user_idx
  ON public.activity_withdrawals (user_id, withdrawn_at DESC);

ALTER TABLE public.activity_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_withdrawals ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.notifications FROM anon, authenticated;
GRANT SELECT ON TABLE public.notifications TO authenticated;
DROP POLICY IF EXISTS "Members can read their own activity notifications"
  ON public.notifications;
CREATE POLICY "Members can read their own activity notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND type = 2);

REVOKE ALL ON TABLE public.activity_receipts FROM anon, authenticated;
GRANT SELECT ON TABLE public.activity_receipts TO authenticated;
DROP POLICY IF EXISTS "Members can read their own activity receipts"
  ON public.activity_receipts;
CREATE POLICY "Members can read their own activity receipts"
  ON public.activity_receipts FOR SELECT TO authenticated
  USING (user_id = auth.uid());

REVOKE ALL ON TABLE public.activity_withdrawals FROM anon, authenticated;
GRANT SELECT ON TABLE public.activity_withdrawals TO authenticated;
DROP POLICY IF EXISTS "Members can read their own activity withdrawals"
  ON public.activity_withdrawals;
CREATE POLICY "Members can read their own activity withdrawals"
  ON public.activity_withdrawals FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.activity_supported_notification(
  p_kind text
) RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT p_kind IN (
    'user_followed', 'review_liked', 'review_commented',
    'comment_replied', 'admin_message'
  );
$$;

REVOKE ALL ON FUNCTION public.activity_supported_notification(text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.get_activity_page(
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 30
) RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_limit integer := LEAST(GREATEST(COALESCE(p_limit, 30), 1), 50);
  v_snapshot_at timestamptz := now();
  v_result jsonb;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'events', '[]'::jsonb,
      'nextCursor', NULL,
      'hasMore', false,
      'snapshotAt', v_snapshot_at
    );
  END IF;

  WITH eligible AS (
    SELECT
      n.id,
      n.created_at,
      n.kind,
      n.body,
      n.actor_id,
      n.data,
      p.username AS actor_username,
      p.avatar_url AS actor_avatar_url,
      p.is_verified AS actor_is_verified,
      p.review_count AS actor_review_count,
      EXISTS (
        SELECT 1
        FROM public.followers f
        WHERE f.follower_id = v_user_id
          AND f.following_id = n.actor_id
      ) AS is_following,
      r.id AS review_id,
      r.image_url AS review_image_path,
      r.location AS review_location_id,
      c.body AS comment_body,
      c.id AS comment_id,
      ar.seen_at,
      ar.read_at
    FROM public.notifications n
    LEFT JOIN public.profiles p ON p.id = n.actor_id
    LEFT JOIN public.reviews r ON r.id = CASE
      WHEN n.data->>'reviewId' ~ '^[0-9]+$' THEN (n.data->>'reviewId')::bigint
      ELSE NULL
    END
    LEFT JOIN public.comments c ON c.id = CASE
      WHEN n.data->>'commentId' ~ '^[0-9]+$' THEN (n.data->>'commentId')::integer
      ELSE NULL
    END
    LEFT JOIN public.activity_receipts ar
      ON ar.notification_id = n.id AND ar.user_id = v_user_id
    WHERE n.user_id = v_user_id
      AND n.type = 2
      AND public.activity_supported_notification(n.kind)
      AND n.created_at >= now() - interval '1 year'
      AND (n.kind = 'admin_message' OR n.actor_id IS NOT NULL)
      AND (p.id IS NULL OR p.deleted = false)
      AND NOT EXISTS (
        SELECT 1
        FROM public.activity_withdrawals aw
        WHERE aw.notification_id = n.id
      )
      AND NOT EXISTS (
        SELECT 1
        FROM public.blocks b
        WHERE n.actor_id IS NOT NULL
          AND ((b.blocker_id = v_user_id AND b.blocked_id = n.actor_id)
            OR (b.blocker_id = n.actor_id AND b.blocked_id = v_user_id))
      )
      AND (
        n.kind = 'admin_message'
        OR (
          r.id IS NOT NULL AND r.state = 1
          AND (n.kind = 'review_liked' OR c.id IS NOT NULL)
        )
      )
      AND (
        p_cursor_created_at IS NULL
        OR n.created_at < p_cursor_created_at
        OR (n.created_at = p_cursor_created_at AND n.id < p_cursor_id)
      )
    ORDER BY n.created_at DESC, n.id DESC
    LIMIT v_limit + 1
  ), page AS (
    SELECT * FROM eligible
    ORDER BY created_at DESC, id DESC
    LIMIT v_limit
  ), payload AS (
    SELECT COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', id,
          'createdAt', created_at,
          'kind', kind,
          'body', body,
          'actor', CASE WHEN actor_id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', actor_id,
            'username', actor_username,
            'avatarUrl', actor_avatar_url,
            'isVerified', COALESCE(actor_is_verified, false),
            'reviewCount', COALESCE(actor_review_count, 0)
          ) END,
          'isFollowing', COALESCE(is_following, false),
          'review', CASE WHEN review_id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', review_id,
            'imagePath', review_image_path,
            'locationId', review_location_id
          ) END,
          'comment', CASE WHEN comment_id IS NULL THEN NULL ELSE jsonb_build_object(
            'id', comment_id,
            'body', comment_body
          ) END,
          'data', COALESCE(data, '{}'::jsonb),
          'seenAt', seen_at,
          'readAt', read_at
        ) ORDER BY created_at DESC, id DESC
      ),
      '[]'::jsonb
    ) AS events
    FROM page
  ), meta AS (
    SELECT count(*) > v_limit AS has_more
    FROM eligible
  ), cursor_row AS (
    SELECT created_at, id
    FROM eligible
    ORDER BY created_at DESC, id DESC
    OFFSET v_limit - 1
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'events', payload.events,
    'hasMore', meta.has_more,
    'snapshotAt', v_snapshot_at,
    'nextCursor', CASE WHEN meta.has_more THEN jsonb_build_object(
      'createdAt', cursor_row.created_at,
      'id', cursor_row.id
    ) ELSE NULL END
  )
  INTO v_result
  FROM payload, meta
  LEFT JOIN cursor_row ON true;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_activity_unseen_count()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT count(*)
  FROM public.notifications n
  LEFT JOIN public.profiles p ON p.id = n.actor_id
  LEFT JOIN public.reviews r ON r.id = CASE
    WHEN n.data->>'reviewId' ~ '^[0-9]+$' THEN (n.data->>'reviewId')::bigint
    ELSE NULL
  END
  LEFT JOIN public.activity_receipts ar
    ON ar.notification_id = n.id AND ar.user_id = auth.uid()
  WHERE auth.uid() IS NOT NULL
    AND n.user_id = auth.uid()
    AND n.type = 2
    AND public.activity_supported_notification(n.kind)
    AND n.created_at >= now() - interval '1 year'
    AND (n.kind = 'admin_message' OR n.actor_id IS NOT NULL)
    AND (p.id IS NULL OR p.deleted = false)
    AND ar.seen_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.activity_withdrawals aw
      WHERE aw.notification_id = n.id
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE n.actor_id IS NOT NULL
        AND ((b.blocker_id = auth.uid() AND b.blocked_id = n.actor_id)
          OR (b.blocker_id = n.actor_id AND b.blocked_id = auth.uid()))
    )
    AND (
      n.kind = 'admin_message'
      OR (
        r.id IS NOT NULL AND r.state = 1
        AND (
          n.kind = 'review_liked'
          OR EXISTS (
            SELECT 1
            FROM public.comments c
            WHERE c.id = CASE
              WHEN n.data->>'commentId' ~ '^[0-9]+$' THEN (n.data->>'commentId')::integer
              ELSE NULL
            END
          )
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.mark_activity_seen_through(
  p_snapshot_at timestamptz
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_snapshot_at IS NULL THEN RETURN; END IF;

  INSERT INTO public.activity_receipts (user_id, notification_id, seen_at)
  SELECT auth.uid(), n.id, now()
  FROM public.notifications n
  LEFT JOIN public.profiles p ON p.id = n.actor_id
  LEFT JOIN public.reviews r ON r.id = CASE
    WHEN n.data->>'reviewId' ~ '^[0-9]+$' THEN (n.data->>'reviewId')::bigint
    ELSE NULL
  END
  WHERE n.user_id = auth.uid()
    AND n.type = 2
    AND n.created_at <= p_snapshot_at
    AND public.activity_supported_notification(n.kind)
    AND n.created_at >= now() - interval '1 year'
    AND (n.kind = 'admin_message' OR n.actor_id IS NOT NULL)
    AND (p.id IS NULL OR p.deleted = false)
    AND NOT EXISTS (SELECT 1 FROM public.activity_withdrawals aw WHERE aw.notification_id = n.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE n.actor_id IS NOT NULL
        AND ((b.blocker_id = auth.uid() AND b.blocked_id = n.actor_id)
          OR (b.blocker_id = n.actor_id AND b.blocked_id = auth.uid()))
    )
    AND (
      n.kind = 'admin_message'
      OR (
        r.id IS NOT NULL AND r.state = 1
        AND (
          n.kind = 'review_liked'
          OR EXISTS (
            SELECT 1
            FROM public.comments c
            WHERE c.id = CASE
              WHEN n.data->>'commentId' ~ '^[0-9]+$' THEN (n.data->>'commentId')::integer
              ELSE NULL
            END
          )
        )
      )
    )
  ON CONFLICT (user_id, notification_id) DO UPDATE
  SET seen_at = COALESCE(public.activity_receipts.seen_at, EXCLUDED.seen_at);
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_activity_read(
  p_notification_ids uuid[]
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR COALESCE(array_length(p_notification_ids, 1), 0) = 0 THEN
    RETURN;
  END IF;
  IF array_length(p_notification_ids, 1) > 50 THEN
    RAISE EXCEPTION 'Too many activity notifications';
  END IF;

  INSERT INTO public.activity_receipts (user_id, notification_id, seen_at, read_at)
  SELECT auth.uid(), n.id, now(), now()
  FROM public.notifications n
  LEFT JOIN public.profiles p ON p.id = n.actor_id
  LEFT JOIN public.reviews r ON r.id = CASE
    WHEN n.data->>'reviewId' ~ '^[0-9]+$' THEN (n.data->>'reviewId')::bigint
    ELSE NULL
  END
  WHERE n.id = ANY(p_notification_ids)
    AND n.user_id = auth.uid()
    AND n.type = 2
    AND public.activity_supported_notification(n.kind)
    AND n.created_at >= now() - interval '1 year'
    AND (n.kind = 'admin_message' OR n.actor_id IS NOT NULL)
    AND (p.id IS NULL OR p.deleted = false)
    AND NOT EXISTS (SELECT 1 FROM public.activity_withdrawals aw WHERE aw.notification_id = n.id)
    AND NOT EXISTS (
      SELECT 1 FROM public.blocks b
      WHERE n.actor_id IS NOT NULL
        AND ((b.blocker_id = auth.uid() AND b.blocked_id = n.actor_id)
          OR (b.blocker_id = n.actor_id AND b.blocked_id = auth.uid()))
    )
    AND (
      n.kind = 'admin_message'
      OR (
        r.id IS NOT NULL AND r.state = 1
        AND (
          n.kind = 'review_liked'
          OR EXISTS (
            SELECT 1
            FROM public.comments c
            WHERE c.id = CASE
              WHEN n.data->>'commentId' ~ '^[0-9]+$' THEN (n.data->>'commentId')::integer
              ELSE NULL
            END
          )
        )
      )
    )
  ON CONFLICT (user_id, notification_id) DO UPDATE
  SET seen_at = COALESCE(public.activity_receipts.seen_at, EXCLUDED.seen_at),
      read_at = COALESCE(public.activity_receipts.read_at, EXCLUDED.read_at);
END;
$$;

REVOKE ALL ON FUNCTION public.get_activity_page(timestamptz, uuid, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_activity_unseen_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_activity_seen_through(timestamptz) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_activity_read(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_activity_page(timestamptz, uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_activity_unseen_count() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_activity_seen_through(timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_activity_read(uuid[]) TO authenticated;

-- Keep event rows as the delivery ledger, but hide reversible/source-deleted
-- activity from the read projection. New timestamps in event keys permit a
-- later re-like/refollow to generate a fresh row.
CREATE OR REPLACE FUNCTION public.withdraw_activity_for_event(
  p_event_key text,
  p_reason text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_event_key IS NULL OR p_reason NOT IN (
    'source_deleted', 'action_undone', 'blocked', 'account_deleted'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
  SELECT n.id, n.user_id, p_reason
  FROM public.notifications n
  WHERE n.event_key = p_event_key
  ON CONFLICT (notification_id) DO UPDATE
  SET reason = EXCLUDED.reason, withdrawn_at = now();
END;
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
  WHERE n.kind IN ('user_followed', 'review_liked', 'review_commented', 'comment_replied')
    AND ((n.user_id = p_left_id AND n.actor_id = p_right_id)
      OR (n.user_id = p_right_id AND n.actor_id = p_left_id))
  ON CONFLICT (notification_id) DO UPDATE
  SET reason = EXCLUDED.reason, withdrawn_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_activity_for_event(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_activity_for_users(uuid, uuid, text) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.withdraw_like_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.withdraw_activity_for_event(
    concat('like:', OLD.review_id, ':', OLD.user_id, ':', OLD.liked_at),
    'action_undone'
  );
  INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
  SELECT n.id, n.user_id, 'action_undone'
  FROM public.notifications n
  WHERE n.kind = 'review_liked'
    AND n.actor_id = OLD.user_id
    AND n.event_key = concat('like:', OLD.review_id, ':', OLD.user_id)
  ON CONFLICT (notification_id) DO UPDATE
  SET reason = EXCLUDED.reason, withdrawn_at = now();
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_follow_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.withdraw_activity_for_event(
    concat('follow:', OLD.follower_id, ':', OLD.following_id, ':', OLD.followed_at),
    'action_undone'
  );
  INSERT INTO public.activity_withdrawals (notification_id, user_id, reason)
  SELECT n.id, n.user_id, 'action_undone'
  FROM public.notifications n
  WHERE n.kind = 'user_followed'
    AND n.actor_id = OLD.follower_id
    AND n.event_key = concat('follow:', OLD.follower_id, ':', OLD.following_id)
  ON CONFLICT (notification_id) DO UPDATE
  SET reason = EXCLUDED.reason, withdrawn_at = now();
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_comment_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.withdraw_activity_for_event(concat('comment:', OLD.id), 'source_deleted');
  RETURN OLD;
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
    WHERE n.kind IN ('review_liked', 'review_commented', 'comment_replied')
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
  WHERE n.kind IN ('review_liked', 'review_commented', 'comment_replied')
    AND n.data->>'reviewId' = OLD.id::text
  ON CONFLICT (notification_id) DO UPDATE
  SET reason = EXCLUDED.reason, withdrawn_at = now();
  RETURN OLD;
END;
$$;

CREATE OR REPLACE FUNCTION public.withdraw_blocked_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  PERFORM public.withdraw_activity_for_users(NEW.blocker_id, NEW.blocked_id, 'blocked');
  RETURN NEW;
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
      AND n.kind IN ('user_followed', 'review_liked', 'review_commented', 'comment_replied')
    ON CONFLICT (notification_id) DO UPDATE
    SET reason = EXCLUDED.reason, withdrawn_at = now();
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.withdraw_like_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_follow_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_comment_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_review_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_deleted_review_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_blocked_activity() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.withdraw_deleted_actor_activity() FROM PUBLIC;

DROP TRIGGER IF EXISTS withdraw_activity_on_like_delete ON public.likes;
CREATE TRIGGER withdraw_activity_on_like_delete
AFTER DELETE ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.withdraw_like_activity();

DROP TRIGGER IF EXISTS withdraw_activity_on_follow_delete ON public.followers;
CREATE TRIGGER withdraw_activity_on_follow_delete
AFTER DELETE ON public.followers
FOR EACH ROW EXECUTE FUNCTION public.withdraw_follow_activity();

DROP TRIGGER IF EXISTS withdraw_activity_on_comment_delete ON public.comments;
CREATE TRIGGER withdraw_activity_on_comment_delete
AFTER DELETE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.withdraw_comment_activity();

DROP TRIGGER IF EXISTS withdraw_activity_on_review_state ON public.reviews;
CREATE TRIGGER withdraw_activity_on_review_state
AFTER UPDATE OF state ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.withdraw_review_activity();

DROP TRIGGER IF EXISTS withdraw_activity_on_review_delete ON public.reviews;
CREATE TRIGGER withdraw_activity_on_review_delete
AFTER DELETE ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.withdraw_deleted_review_activity();

DROP TRIGGER IF EXISTS withdraw_activity_on_block_insert ON public.blocks;
CREATE TRIGGER withdraw_activity_on_block_insert
AFTER INSERT ON public.blocks
FOR EACH ROW EXECUTE FUNCTION public.withdraw_blocked_activity();

DROP TRIGGER IF EXISTS withdraw_activity_on_profile_delete ON public.profiles;
CREATE TRIGGER withdraw_activity_on_profile_delete
AFTER UPDATE OF deleted ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.withdraw_deleted_actor_activity();

-- Replace permanent actor/object deduplication for reversible actions. The
-- timestamp is part of the lifecycle key, so a new active action gets a row.
CREATE OR REPLACE FUNCTION public.enqueue_like_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner_id uuid;
  v_actor_name text;
  v_location_id bigint;
  v_location_name text;
BEGIN
  SELECT r.user_id, r.location, l.name
  INTO v_owner_id, v_location_id, v_location_name
  FROM public.reviews r
  LEFT JOIN public.locations l ON l.id = r.location
  WHERE r.id = NEW.review_id;

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
    concat(v_actor_name, ' liked your review from ', COALESCE(v_location_name, 'an unknown location')),
    2,
    'review_liked',
    jsonb_build_object(
      'kind', 'review_liked',
      'reviewId', NEW.review_id,
      'url', concat('/r/', NEW.review_id, '?comments=1')
    ),
    concat('like:', NEW.review_id, ':', NEW.user_id, ':', NEW.liked_at)
  ) ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_follow_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name text;
BEGIN
  IF public.push_users_are_blocked(NEW.follower_id, NEW.following_id) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(username, 'Someone') INTO v_actor_name
  FROM public.profiles WHERE id = NEW.follower_id;

  INSERT INTO public.notifications (
    user_id, actor_id, body, type, kind, data, event_key
  ) VALUES (
    NEW.following_id,
    NEW.follower_id,
    concat(v_actor_name, ' started following you'),
    2,
    'user_followed',
    jsonb_build_object(
      'kind', 'user_followed',
      'url', concat('/users/', v_actor_name)
    ),
    concat('follow:', NEW.follower_id, ':', NEW.following_id, ':', NEW.followed_at)
  ) ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_like_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_follow_notification() FROM PUBLIC;

DROP TRIGGER IF EXISTS notify_on_like_insert ON public.likes;
CREATE TRIGGER notify_on_like_insert
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.enqueue_like_notification();

DROP TRIGGER IF EXISTS notify_on_follow_insert ON public.followers;
CREATE TRIGGER notify_on_follow_insert
AFTER INSERT ON public.followers
FOR EACH ROW EXECUTE FUNCTION public.enqueue_follow_notification();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activity_receipts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_receipts;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'activity_withdrawals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_withdrawals;
  END IF;
END;
$$;

COMMIT;
