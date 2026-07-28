-- Verified profiles are controlled by the backend and rendered with the
-- verified admin badge throughout the app.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false;

UPDATE public.profiles AS profile
SET is_verified = true
FROM auth.users AS app_user
WHERE profile.id = app_user.id
  AND lower(app_user.email) = 'owen@hopemediahouse.com';

CREATE OR REPLACE FUNCTION public.protect_profile_verification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.is_verified IS DISTINCT FROM OLD.is_verified
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Only administrators can change profile verification';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_verification ON public.profiles;
CREATE TRIGGER protect_profile_verification
BEFORE UPDATE OF is_verified ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_verification();

CREATE OR REPLACE FUNCTION public.feed_reviews(
  p_viewer uuid,
  p_limit integer DEFAULT 20,
  p_offset integer DEFAULT 0,
  p_user_id uuid DEFAULT NULL,
  p_location_id bigint DEFAULT NULL,
  p_exclude_blocked boolean DEFAULT true
)
RETURNS TABLE (
  id bigint,
  comment text,
  image_url text,
  inserted_at timestamp with time zone,
  taste bigint,
  presentation bigint,
  user_id uuid,
  location jsonb,
  spirit jsonb,
  type jsonb,
  profile jsonb,
  likes_count bigint,
  comments_count bigint,
  has_liked boolean,
  recent_comments jsonb
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    r.id,
    r.comment,
    r.image_url,
    r.inserted_at,
    r.taste,
    r.presentation,
    r.user_id,
    to_jsonb(json_build_object('id', l.id, 'name', l.name, 'address', l.address)),
    to_jsonb(json_build_object('name', s.name)),
    to_jsonb(json_build_object('name', t.name)),
    to_jsonb(json_build_object(
      'id', p.id,
      'username', p.username,
      'avatar_url', p.avatar_url,
      'is_verified', p.is_verified
    )),
    COALESCE(lk.cnt, 0) AS likes_count,
    COALESCE(cm.cnt, 0) AS comments_count,
    (ul.user_id IS NOT NULL) AS has_liked,
    COALESCE(rc.items, '[]'::jsonb) AS recent_comments
  FROM public.reviews r
  JOIN public.profiles p
    ON p.id = r.user_id AND p.deleted = false
  LEFT JOIN public.locations l ON l.id = r.location
  LEFT JOIN public.spirits s ON s.id = r.spirit
  LEFT JOIN public.types t ON t.id = r.type
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.comments WHERE review_id = r.id
  ) cm ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.likes WHERE review_id = r.id
  ) lk ON true
  LEFT JOIN public.likes ul
    ON ul.review_id = r.id AND ul.user_id = p_viewer
  LEFT JOIN LATERAL (
    SELECT jsonb_agg(
             jsonb_build_object(
               'id', c.id,
               'body', c.body,
               'inserted_at', c.inserted_at,
               'profile', jsonb_build_object(
                 'id', cp.id,
                 'username', cp.username,
                 'avatar_url', cp.avatar_url,
                 'is_verified', cp.is_verified
               )
             )
             ORDER BY c.inserted_at DESC
           ) AS items
    FROM (
      SELECT * FROM public.comments
      WHERE review_id = r.id
      ORDER BY inserted_at DESC
      LIMIT 2
    ) c
    JOIN public.profiles cp ON cp.id = c.user_id
  ) rc ON true
  WHERE r.state = 1
    AND (p_user_id IS NULL OR r.user_id = p_user_id)
    AND (p_location_id IS NULL OR r.location = p_location_id)
    AND (
      NOT p_exclude_blocked
      OR NOT EXISTS (
        SELECT 1 FROM public.blocks b
        WHERE (b.blocker_id = p_viewer AND b.blocked_id = r.user_id)
           OR (b.blocker_id = r.user_id AND b.blocked_id = p_viewer)
      )
    )
  ORDER BY r.inserted_at DESC
  LIMIT p_limit
  OFFSET p_offset;
$$;

DROP FUNCTION IF EXISTS public.top_profiles(integer, text);

CREATE FUNCTION public.top_profiles(
  p_limit integer DEFAULT 50,
  p_search text DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  username text,
  avatar_url text,
  is_verified boolean,
  follower_count bigint,
  review_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    p.is_verified,
    COALESCE(f.follower_count, 0) AS follower_count,
    COALESCE(r.review_count, 0) AS review_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT following_id, count(*) AS follower_count
    FROM public.followers
    GROUP BY following_id
  ) f ON f.following_id = p.id
  LEFT JOIN (
    SELECT user_id, count(*) AS review_count
    FROM public.reviews
    WHERE state = 1
    GROUP BY user_id
  ) r ON r.user_id = p.id
  WHERE p.deleted = false
    AND p.username IS NOT NULL
    AND (
      p_search IS NULL
      OR p_search = ''
      OR p.username ILIKE '%' || replace(replace(p_search, '%', '\%'), '_', '\_') || '%'
    )
  ORDER BY r.review_count DESC NULLS LAST,
           f.follower_count DESC NULLS LAST,
           p.username ASC
  LIMIT p_limit;
$$;

ALTER FUNCTION public.top_profiles(integer, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.top_profiles(integer, text) TO authenticated;
GRANT ALL ON FUNCTION public.top_profiles(integer, text) TO service_role;
