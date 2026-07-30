BEGIN;

-- Push tokens are installation credentials, not public profile data. Keep one
-- row per app installation so a user can receive notifications on every device.
CREATE TABLE IF NOT EXISTS public.push_tokens (
  expo_push_token text PRIMARY KEY,
  installation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL CHECK (platform IN ('ios', 'android', 'unknown')),
  app_environment text NOT NULL DEFAULT 'production',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_error text
);

CREATE INDEX IF NOT EXISTS push_tokens_user_id_idx
  ON public.push_tokens(user_id);

CREATE UNIQUE INDEX IF NOT EXISTS push_tokens_installation_id_unique_idx
  ON public.push_tokens(installation_id);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_tokens FROM anon, authenticated;
GRANT ALL ON TABLE public.push_tokens TO service_role;

-- Security-definer registration lets an installation move safely between
-- accounts without exposing anybody else's token to the client.
CREATE OR REPLACE FUNCTION public.register_push_token(
  p_token text,
  p_installation_id uuid,
  p_platform text,
  p_app_environment text DEFAULT 'production'
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[^]]+\]$' THEN
    RAISE EXCEPTION 'Invalid Expo push token';
  END IF;

  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'Unsupported push platform';
  END IF;

  DELETE FROM public.push_tokens
  WHERE installation_id = p_installation_id
    AND expo_push_token <> p_token;

  INSERT INTO public.push_tokens (
    expo_push_token,
    installation_id,
    user_id,
    platform,
    app_environment,
    updated_at,
    last_error
  ) VALUES (
    p_token,
    p_installation_id,
    v_user_id,
    p_platform,
    COALESCE(NULLIF(p_app_environment, ''), 'production'),
    now(),
    NULL
  )
  ON CONFLICT (expo_push_token) DO UPDATE SET
    user_id = EXCLUDED.user_id,
    installation_id = EXCLUDED.installation_id,
    platform = EXCLUDED.platform,
    app_environment = EXCLUDED.app_environment,
    updated_at = now(),
    last_error = NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.unregister_push_token(p_installation_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.push_tokens
  WHERE installation_id = p_installation_id;
$$;

REVOKE ALL ON FUNCTION public.register_push_token(text, uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unregister_push_token(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_push_token(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unregister_push_token(uuid) TO anon, authenticated;

-- Preserve existing installations, then erase the publicly readable legacy
-- values. The nullable profile column remains temporarily for old app builds.
INSERT INTO public.push_tokens (expo_push_token, user_id, platform, app_environment)
SELECT expo_push_token, min(id::text)::uuid, 'unknown', 'production'
FROM public.profiles
WHERE expo_push_token IS NOT NULL
  AND expo_push_token ~ '^(ExponentPushToken|ExpoPushToken)\[[^]]+\]$'
GROUP BY expo_push_token
HAVING count(*) = 1
ON CONFLICT (expo_push_token) DO UPDATE SET
  user_id = EXCLUDED.user_id,
  updated_at = now();

UPDATE public.profiles SET expo_push_token = NULL
WHERE expo_push_token IS NOT NULL;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text,
  ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS event_key text;

CREATE UNIQUE INDEX IF NOT EXISTS notifications_event_key_unique_idx
  ON public.notifications(event_key)
  WHERE event_key IS NOT NULL;

-- Tickets are private delivery bookkeeping used to inspect receipts and retire
-- tokens rejected by APNs or FCM.
CREATE TABLE IF NOT EXISTS public.push_tickets (
  ticket_id text PRIMARY KEY,
  notification_id uuid REFERENCES public.notifications(id) ON DELETE CASCADE,
  expo_push_token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  checked_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  error text
);

CREATE INDEX IF NOT EXISTS push_tickets_pending_idx
  ON public.push_tickets(created_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS push_tickets_notification_token_unique_idx
  ON public.push_tickets(notification_id, expo_push_token);

ALTER TABLE public.push_tickets ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.push_tickets FROM anon, authenticated;
GRANT ALL ON TABLE public.push_tickets TO service_role;

-- Notification rows are now generated from verified database events only.
DROP POLICY IF EXISTS "Allow insert notifications for authenticated users"
  ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users can insert notifications"
  ON public.notifications;
DROP POLICY IF EXISTS "Allow public inserts into notifications"
  ON public.notifications;
REVOKE INSERT ON TABLE public.notifications FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.push_users_are_blocked(
  p_actor_id uuid,
  p_recipient_id uuid
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.blocks
    WHERE (blocker_id = p_actor_id AND blocked_id = p_recipient_id)
       OR (blocker_id = p_recipient_id AND blocked_id = p_actor_id)
  );
$$;

REVOKE ALL ON FUNCTION public.push_users_are_blocked(uuid, uuid) FROM PUBLIC;

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
      'url', CASE WHEN v_location_id IS NULL THEN '/home' ELSE concat('/places/', v_location_id) END
    ),
    concat('like:', NEW.review_id, ':', NEW.user_id)
  ) ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_comment_notification()
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
    concat(v_actor_name, ' commented on your review from ', COALESCE(v_location_name, 'an unknown location')),
    2,
    'review_commented',
    jsonb_build_object(
      'kind', 'review_commented',
      'reviewId', NEW.review_id,
      'commentId', NEW.id,
      'url', CASE WHEN v_location_id IS NULL THEN '/home' ELSE concat('/places/', v_location_id) END
    ),
    concat('comment:', NEW.id)
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
    concat('follow:', NEW.follower_id, ':', NEW.following_id)
  ) ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enqueue_review_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_name text;
  v_location_name text;
BEGIN
  IF NEW.state IS DISTINCT FROM 1 THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(username, 'Someone') INTO v_actor_name
  FROM public.profiles WHERE id = NEW.user_id;
  SELECT name INTO v_location_name
  FROM public.locations WHERE id = NEW.location;

  INSERT INTO public.notifications (
    user_id, actor_id, body, type, kind, data, event_key
  ) VALUES (
    NEW.user_id,
    NEW.user_id,
    concat(v_actor_name, ' has posted a new review from ', COALESCE(v_location_name, 'a location')),
    1,
    'review_created',
    jsonb_build_object(
      'kind', 'review_created',
      'reviewId', NEW.id,
      'url', CASE WHEN NEW.location IS NULL THEN '/home' ELSE concat('/places/', NEW.location) END
    ),
    concat('review:', NEW.id)
  ) ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_like_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_comment_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_follow_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.enqueue_review_notification() FROM PUBLIC;

DROP TRIGGER IF EXISTS notify_on_like_insert ON public.likes;
CREATE TRIGGER notify_on_like_insert
AFTER INSERT ON public.likes
FOR EACH ROW EXECUTE FUNCTION public.enqueue_like_notification();

DROP TRIGGER IF EXISTS notify_on_comment_insert ON public.comments;
CREATE TRIGGER notify_on_comment_insert
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.enqueue_comment_notification();

DROP TRIGGER IF EXISTS notify_on_follow_insert ON public.followers;
CREATE TRIGGER notify_on_follow_insert
AFTER INSERT ON public.followers
FOR EACH ROW EXECUTE FUNCTION public.enqueue_follow_notification();

DROP TRIGGER IF EXISTS notify_on_review_insert ON public.reviews;
CREATE TRIGGER notify_on_review_insert
AFTER INSERT ON public.reviews
FOR EACH ROW EXECUTE FUNCTION public.enqueue_review_notification();

COMMIT;
