-- Discover: rank profiles server-side.
--
-- The client was downloading every profile row, every published review row and
-- every follower row on each visit, then counting them in JavaScript. That is
-- three unbounded table scans over the wire and it gets worse with every
-- signup. top_profiles() already existed and did the aggregation in SQL but
-- was unused, unbounded, and included soft-deleted accounts.

DROP FUNCTION IF EXISTS "public"."top_profiles"();

CREATE OR REPLACE FUNCTION "public"."top_profiles"(
  "p_limit" integer DEFAULT 50,
  "p_search" "text" DEFAULT NULL
)
RETURNS TABLE (
  "id" "uuid",
  "username" "text",
  "avatar_url" "text",
  "follower_count" bigint,
  "review_count" bigint
)
LANGUAGE "sql"
STABLE
SECURITY INVOKER
SET "search_path" = "public"
AS $$
  SELECT
    p.id,
    p.username,
    p.avatar_url,
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
      -- escape LIKE wildcards so a user typing % or _ can't widen the match
      OR p.username ILIKE '%' || replace(replace(p_search, '%', '\%'), '_', '\_') || '%'
    )
  ORDER BY r.review_count DESC NULLS LAST,
           f.follower_count DESC NULLS LAST,
           p.username ASC
  LIMIT p_limit;
$$;

ALTER FUNCTION "public"."top_profiles"(integer, "text") OWNER TO "postgres";
GRANT ALL ON FUNCTION "public"."top_profiles"(integer, "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."top_profiles"(integer, "text") TO "service_role";

CREATE INDEX IF NOT EXISTS "followers_following_id_idx"
  ON "public"."followers" USING "btree" ("following_id");
CREATE INDEX IF NOT EXISTS "reviews_user_id_state_idx"
  ON "public"."reviews" USING "btree" ("user_id", "state");
