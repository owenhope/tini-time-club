-- Security tightening (2026-07-27 audit).
-- The app always runs authenticated; nothing legitimate reads these tables anon.

-- ── comments: RLS was completely DISABLED ─────────────────────────────────────
-- Anyone holding the public anon key could read, modify, or delete any comment.
ALTER TABLE "public"."comments" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read comments"
  ON "public"."comments" FOR SELECT TO "authenticated"
  USING (true);

CREATE POLICY "Users can insert their own comments"
  ON "public"."comments" FOR INSERT TO "authenticated"
  WITH CHECK ((SELECT "auth"."uid"()) = "user_id");

CREATE POLICY "Users can delete their own comments"
  ON "public"."comments" FOR DELETE TO "authenticated"
  USING ((SELECT "auth"."uid"()) = "user_id");

-- ── profiles: drop anon-wide reads (exposed expo_push_token to anyone) ───────
-- "Allow public read of profiles" (auth.role() = 'authenticated') and
-- "Authenticated users can read their profiles" remain, so signed-in app
-- behavior is unchanged. The push edge function now uses the service role.
DROP POLICY IF EXISTS "Allow select for anon" ON "public"."profiles";
DROP POLICY IF EXISTS "Allow public select on profiles" ON "public"."profiles";
DROP POLICY IF EXISTS "Public read profiles" ON "public"."profiles";

-- ── notifications: stop unauthenticated inserts ───────────────────────────────
-- The old "Allow public inserts into notifications" (WITH CHECK true) let anon
-- clients insert rows targeting any user — each of which triggered a push.
-- The app legitimately inserts notifications for OTHER users (like/follow
-- notifications), so authenticated inserts must stay open for now.
-- Follow-up (Phase 2): generate notifications in a database trigger instead,
-- then drop the authenticated insert policy too.
DROP POLICY IF EXISTS "Allow public inserts into notifications" ON "public"."notifications";

CREATE POLICY "Authenticated users can insert notifications"
  ON "public"."notifications" FOR INSERT TO "authenticated"
  WITH CHECK (true);

-- ── followers: reads require auth ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow public select on followers" ON "public"."followers";

CREATE POLICY "Authenticated users can read followers"
  ON "public"."followers" FOR SELECT TO "authenticated"
  USING (true);

-- ── reviews: reads require auth ───────────────────────────────────────────────
DROP POLICY IF EXISTS "Public read reviews" ON "public"."reviews";

CREATE POLICY "Authenticated users can read published reviews"
  ON "public"."reviews" FOR SELECT TO "authenticated"
  USING ("state" = 1);
