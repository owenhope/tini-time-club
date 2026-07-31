-- Ranking tiers ("avatar rings") are driven by how many active reviews a
-- profile has. Store the count on profiles and maintain it with a trigger so
-- every surface that already selects a profile (feed rows, comments, follow
-- lists, top_profiles) can carry it without extra queries.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS review_count integer NOT NULL DEFAULT 0;

-- Backfill every profile so rerunning this migration also repairs stale
-- counts, including profiles whose review count has returned to zero.
UPDATE public.profiles p
SET review_count = (
  SELECT count(*)::integer
  FROM public.reviews r
  WHERE r.user_id = p.id
    AND r.state = 1
);

CREATE OR REPLACE FUNCTION public.protect_profile_review_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.review_count IS DISTINCT FROM OLD.review_count
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Review counts are maintained by review activity';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_review_count ON public.profiles;
CREATE TRIGGER protect_profile_review_count
BEFORE UPDATE OF review_count ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_review_count();

CREATE OR REPLACE FUNCTION public.sync_profile_review_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  affected uuid[];
  uid uuid;
BEGIN
  -- Recompute in full for every user the write could have touched; cheap
  -- per-write and immune to drift.
  affected := ARRAY(
    SELECT DISTINCT u FROM unnest(ARRAY[
      CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN NEW.user_id END,
      CASE WHEN TG_OP IN ('DELETE', 'UPDATE') THEN OLD.user_id END
    ]) AS u
    WHERE u IS NOT NULL
  );

  FOREACH uid IN ARRAY affected LOOP
    UPDATE public.profiles
    SET review_count = (
      SELECT count(*) FROM public.reviews
      WHERE user_id = uid AND state = 1
    )
    WHERE id = uid;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_profile_review_count ON public.reviews;
CREATE TRIGGER sync_profile_review_count
AFTER INSERT OR DELETE OR UPDATE OF state, user_id ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_review_count();

-- A regular's review_count is specific to one location. Return the profile's
-- global count separately so avatar rank never changes between locations.
DROP FUNCTION IF EXISTS public.get_regulars_for_locations(bigint[], integer);

CREATE FUNCTION public.get_regulars_for_locations(
  p_location_ids bigint[],
  p_limit integer DEFAULT 3
)
RETURNS TABLE(
  location_id bigint,
  rank integer,
  profile_id uuid,
  username text,
  avatar_url text,
  is_verified boolean,
  review_count integer,
  profile_review_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    membership.location_id,
    membership.rank::integer,
    p.id AS profile_id,
    p.username,
    p.avatar_url,
    COALESCE(p.is_verified, false) AS is_verified,
    membership.review_count,
    p.review_count AS profile_review_count
  FROM public.regular_memberships AS membership
  JOIN public.profiles AS p
    ON p.id = membership.profile_id
   AND p.deleted = false
  WHERE membership.location_id = ANY(p_location_ids)
    AND membership.rank <= greatest(1, least(COALESCE(p_limit, 3), 3))
  ORDER BY membership.location_id, membership.rank;
$$;

REVOKE ALL ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  TO anon, authenticated;

-- Ship the count with feed rows: author profile and comment-preview profiles.
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
      'is_verified', p.is_verified,
      'review_count', p.review_count
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
                 'is_verified', cp.is_verified,
                 'review_count', cp.review_count
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
