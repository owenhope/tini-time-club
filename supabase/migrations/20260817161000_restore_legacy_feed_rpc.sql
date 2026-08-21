BEGIN;

-- The currently released 3.1 client calls feed_reviews with six named
-- arguments. Keep that contract available while 4.0 adds followed-only
-- filtering through a separately named RPC. Replacing the six-argument
-- function in-place caused PostgREST to reject requests from the live app.
ALTER FUNCTION public.feed_reviews(
  uuid,
  integer,
  integer,
  uuid,
  bigint,
  boolean,
  boolean
) RENAME TO feed_reviews_followed;

CREATE FUNCTION public.feed_reviews(
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
  taste numeric(2, 1),
  presentation numeric(2, 1),
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
SET search_path = public, pg_temp
AS $$
  SELECT *
  FROM public.feed_reviews_followed(
    p_viewer,
    p_limit,
    p_offset,
    p_user_id,
    p_location_id,
    p_exclude_blocked,
    false
  );
$$;

REVOKE ALL ON FUNCTION public.feed_reviews(
  uuid,
  integer,
  integer,
  uuid,
  bigint,
  boolean
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.feed_reviews(
  uuid,
  integer,
  integer,
  uuid,
  bigint,
  boolean
) TO authenticated, service_role;

COMMIT;
