-- Feed query with aggregates computed server-side.
--
-- The client previously fetched a page of reviews, then for each row issued a
-- likes count query, a "did I like this" query and a comments query — roughly
-- 60 extra round trips per 20-item page. This returns everything in one call.
--
-- Blocked users and soft-deleted profiles are filtered here too, so paging
-- can no longer come back short and stop the feed early.

CREATE OR REPLACE FUNCTION "public"."feed_reviews"(
  "p_viewer" "uuid",
  "p_limit" integer DEFAULT 20,
  "p_offset" integer DEFAULT 0,
  "p_user_id" "uuid" DEFAULT NULL,
  "p_location_id" bigint DEFAULT NULL,
  "p_exclude_blocked" boolean DEFAULT true
)
RETURNS TABLE (
  "id" bigint,
  "comment" "text",
  "image_url" "text",
  "inserted_at" timestamp with time zone,
  "taste" bigint,
  "presentation" bigint,
  "user_id" "uuid",
  "location" "jsonb",
  "spirit" "jsonb",
  "type" "jsonb",
  "profile" "jsonb",
  "likes_count" bigint,
  "comments_count" bigint,
  "has_liked" boolean
)
LANGUAGE "sql"
STABLE
SECURITY INVOKER
SET "search_path" = "public"
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
    to_jsonb(json_build_object('id', p.id, 'username', p.username, 'avatar_url', p.avatar_url)),
    COALESCE(lk.cnt, 0) AS likes_count,
    COALESCE(cm.cnt, 0) AS comments_count,
    (ul.user_id IS NOT NULL) AS has_liked
  FROM public.reviews r
  JOIN public.profiles p
    ON p.id = r.user_id AND p.deleted = false
  LEFT JOIN public.locations l ON l.id = r.location
  LEFT JOIN public.spirits s ON s.id = r.spirit
  LEFT JOIN public.types t ON t.id = r.type
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.likes WHERE review_id = r.id
  ) lk ON true
  LEFT JOIN LATERAL (
    SELECT count(*) AS cnt FROM public.comments WHERE review_id = r.id
  ) cm ON true
  LEFT JOIN public.likes ul
    ON ul.review_id = r.id AND ul.user_id = p_viewer
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

ALTER FUNCTION "public"."feed_reviews"("uuid", integer, integer, "uuid", bigint, boolean)
  OWNER TO "postgres";

-- SECURITY INVOKER above means RLS still applies to the caller.
GRANT ALL ON FUNCTION "public"."feed_reviews"("uuid", integer, integer, "uuid", bigint, boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."feed_reviews"("uuid", integer, integer, "uuid", bigint, boolean) TO "service_role";

-- Supporting indexes for the per-review aggregates and the feed ordering.
CREATE INDEX IF NOT EXISTS "likes_review_id_idx" ON "public"."likes" USING "btree" ("review_id");
CREATE INDEX IF NOT EXISTS "comments_review_id_idx" ON "public"."comments" USING "btree" ("review_id");
CREATE INDEX IF NOT EXISTS "reviews_state_inserted_at_idx"
  ON "public"."reviews" USING "btree" ("state", "inserted_at" DESC);
CREATE INDEX IF NOT EXISTS "blocks_blocker_blocked_idx"
  ON "public"."blocks" USING "btree" ("blocker_id", "blocked_id");
