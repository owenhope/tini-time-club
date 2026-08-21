

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "gis";


ALTER SCHEMA "gis" OWNER TO "postgres";


CREATE EXTENSION IF NOT EXISTS "pg_net" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgsodium";






COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgjwt" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "postgis" WITH SCHEMA "gis";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."locations_in_view"("min_lat" double precision, "min_long" double precision, "max_lat" double precision, "max_long" double precision) RETURNS TABLE("id" bigint, "name" "text", "address" "text", "lat" double precision, "long" double precision, "rating" double precision, "taste_avg" double precision, "presentation_avg" double precision, "total_ratings" integer)
    LANGUAGE "sql"
    SET "search_path" TO 'public'
    AS $$SELECT
  id,
  name,
  address,
  lat,
  lon AS "long",
  rating,
  taste_avg,
  presentation_avg,
  total_ratings
FROM location_ratings
WHERE lat BETWEEN min_lat AND max_lat
  AND lon BETWEEN min_long AND max_long
  AND total_ratings > 0;$$;


ALTER FUNCTION "public"."locations_in_view"("min_lat" double precision, "min_long" double precision, "max_lat" double precision, "max_long" double precision) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."top_locations"() RETURNS TABLE("id" bigint, "name" "text", "address" "text", "created_by" "uuid", "review_count" bigint, "rating" numeric)
    LANGUAGE "sql"
    AS $$SELECT 
  l.id, 
  l.name, 
  l.address, 
  l.created_by, 
  COUNT(r.id) as review_count,
  COALESCE(ROUND(AVG((r.taste + r.presentation) / 2.0), 1), 0) as rating
FROM locations l
LEFT JOIN reviews r ON l.id = r.location AND r.state = 1
GROUP BY l.id, l.name, l.address, l.created_by
HAVING COUNT(r.id) > 0
ORDER BY review_count DESC
LIMIT 10;$$;


ALTER FUNCTION "public"."top_locations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."top_profiles"() RETURNS TABLE("id" "uuid", "username" "text", "avatar_url" "text", "follower_count" bigint, "review_count" bigint)
    LANGUAGE "sql"
    AS $$
  SELECT
    p.id,
    p.username,
    p.avatar_url,
    COALESCE(follower_counts.follower_count, 0) as follower_count,
    COALESCE(review_counts.review_count, 0) as review_count
  FROM profiles p
  LEFT JOIN (
    SELECT following_id, COUNT(*) as follower_count
    FROM followers
    GROUP BY following_id
  ) follower_counts ON p.id = follower_counts.following_id
  LEFT JOIN (
    SELECT user_id, COUNT(*) as review_count
    FROM reviews
    WHERE state = 1
    GROUP BY user_id
  ) review_counts ON p.id = review_counts.user_id
  ORDER BY COALESCE(review_counts.review_count, 0) DESC
  LIMIT 10;
$$;


ALTER FUNCTION "public"."top_profiles"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."blocks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "blocker_id" "uuid",
    "blocked_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."blocks" OWNER TO "postgres";


COMMENT ON TABLE "public"."blocks" IS 'Tracks user blocks - when one user blocks another';



COMMENT ON COLUMN "public"."blocks"."blocker_id" IS 'ID of the user who is blocking';



COMMENT ON COLUMN "public"."blocks"."blocked_id" IS 'ID of the user being blocked';



CREATE TABLE IF NOT EXISTS "public"."comments" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "review_id" integer NOT NULL,
    "body" "text" NOT NULL,
    "inserted_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."comments" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."comments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."comments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."comments_id_seq" OWNED BY "public"."comments"."id";



CREATE TABLE IF NOT EXISTS "public"."followers" (
    "follower_id" "uuid" NOT NULL,
    "following_id" "uuid" NOT NULL,
    "followed_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "followers_check" CHECK (("follower_id" <> "following_id"))
);


ALTER TABLE "public"."followers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."likes" (
    "user_id" "uuid" NOT NULL,
    "review_id" integer NOT NULL,
    "liked_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" bigint NOT NULL,
    "name" "text",
    "location" "gis"."geography"(Point,4326) NOT NULL,
    "created_by" "uuid" NOT NULL,
    "inserted_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "address" "text",
    "place_id" "text"
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


COMMENT ON COLUMN "public"."locations"."place_id" IS 'Google Places API place_id for location matching';



CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "image_url" "text",
    "comment" "text",
    "inserted_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "type" bigint,
    "spirit" bigint,
    "location" bigint,
    "taste" bigint,
    "presentation" bigint,
    "state" bigint
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE OR REPLACE VIEW "public"."location_ratings" AS
 SELECT "l"."id",
    "l"."name",
    "l"."address",
    "gis"."st_y"(("l"."location")::"gis"."geometry") AS "lat",
    "gis"."st_x"(("l"."location")::"gis"."geometry") AS "lon",
    COALESCE("round"("avg"(((("r"."taste" + "r"."presentation"))::numeric / 2.0)), 1), (0)::numeric) AS "rating",
    COALESCE("round"("avg"("r"."taste"), 1), (0)::numeric) AS "taste_avg",
    COALESCE("round"("avg"("r"."presentation"), 1), (0)::numeric) AS "presentation_avg",
    "count"("r"."id") AS "total_ratings"
   FROM ("public"."locations" "l"
     LEFT JOIN "public"."reviews" "r" ON ((("l"."id" = "r"."location") AND ("r"."state" = 1))))
  GROUP BY "l"."id", "l"."name", "l"."address", "l"."location"
 HAVING ("count"("r"."id") > 0);


ALTER TABLE "public"."location_ratings" OWNER TO "postgres";


ALTER TABLE "public"."locations" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."locations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."notification_types" (
    "id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text" NOT NULL
);


ALTER TABLE "public"."notification_types" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."notification_types_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "public"."notification_types_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notification_types_id_seq" OWNED BY "public"."notification_types"."id";



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "user_id" "uuid" DEFAULT "gen_random_uuid"(),
    "body" "text",
    "type" integer
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "expo_push_token" "text",
    "avatar_url" "text",
    "eula_accepted" boolean DEFAULT false,
    "eula_accepted_at" timestamp with time zone,
    "deleted" boolean DEFAULT false,
    "deleted_at" timestamp with time zone,
    "name" "text",
    "bio" "text",
    "favorite_spirits" "jsonb" DEFAULT '[]'::"jsonb",
    "favorite_types" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "bio_length_check" CHECK ((("bio" IS NULL) OR ("length"("bio") <= 150)))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."eula_accepted" IS 'Tracks whether user has accepted the End User License Agreement';



COMMENT ON COLUMN "public"."profiles"."eula_accepted_at" IS 'Timestamp when user accepted the EULA';



COMMENT ON COLUMN "public"."profiles"."deleted" IS 'Soft delete flag - true when account is deactivated';



COMMENT ON COLUMN "public"."profiles"."deleted_at" IS 'Timestamp when account was deactivated';



COMMENT ON COLUMN "public"."profiles"."name" IS 'Display name for the user profile';



COMMENT ON COLUMN "public"."profiles"."bio" IS 'User biography (max 150 characters)';



COMMENT ON COLUMN "public"."profiles"."favorite_spirits" IS 'Array of favorite spirit IDs stored as JSONB';



COMMENT ON COLUMN "public"."profiles"."favorite_types" IS 'Array of favorite type IDs stored as JSONB';



CREATE TABLE IF NOT EXISTS "public"."reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid",
    "review_id" bigint,
    "creator_id" "uuid",
    "reason" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "status" "text" DEFAULT 'pending'::"text",
    CONSTRAINT "reports_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'reviewed'::"text", 'resolved'::"text", 'dismissed'::"text"])))
);


ALTER TABLE "public"."reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."review_states" (
    "id" bigint NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "name" "text"
);


ALTER TABLE "public"."review_states" OWNER TO "postgres";


ALTER TABLE "public"."review_states" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."review_states_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE "public"."reviews" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."reviews_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."spirits" (
    "id" bigint NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."spirits" OWNER TO "postgres";


ALTER TABLE "public"."spirits" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."spirits_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



CREATE TABLE IF NOT EXISTS "public"."types" (
    "id" bigint NOT NULL,
    "name" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."types" OWNER TO "postgres";


ALTER TABLE "public"."types" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."comments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."comments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notification_types" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notification_types_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_blocker_id_blocked_id_key" UNIQUE ("blocker_id", "blocked_id");



ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_pkey" PRIMARY KEY ("follower_id", "following_id");



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_pkey" PRIMARY KEY ("user_id", "review_id");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_types"
    ADD CONSTRAINT "notification_types_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."review_states"
    ADD CONSTRAINT "review_states_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spirits"
    ADD CONSTRAINT "spirits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."types"
    ADD CONSTRAINT "types_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_blocks_blocked_id" ON "public"."blocks" USING "btree" ("blocked_id");



CREATE INDEX "idx_blocks_blocker_id" ON "public"."blocks" USING "btree" ("blocker_id");



CREATE INDEX "idx_follower_id" ON "public"."followers" USING "btree" ("follower_id");



CREATE INDEX "idx_following_id" ON "public"."followers" USING "btree" ("following_id");



CREATE INDEX "idx_profiles_deleted" ON "public"."profiles" USING "btree" ("deleted");



CREATE INDEX "idx_profiles_favorite_spirits" ON "public"."profiles" USING "gin" ("favorite_spirits");



CREATE INDEX "idx_profiles_favorite_types" ON "public"."profiles" USING "gin" ("favorite_types");



CREATE INDEX "idx_reports_creator_id" ON "public"."reports" USING "btree" ("creator_id");



CREATE INDEX "idx_reports_reporter_id" ON "public"."reports" USING "btree" ("reporter_id");



CREATE INDEX "idx_reports_review_id" ON "public"."reports" USING "btree" ("review_id");



CREATE INDEX "idx_reports_status" ON "public"."reports" USING "btree" ("status");



CREATE INDEX "locations_geo_index" ON "public"."locations" USING "gist" ("location");



CREATE UNIQUE INDEX "locations_place_id_unique_idx" ON "public"."locations" USING "btree" ("place_id") WHERE ("place_id" IS NOT NULL);



CREATE UNIQUE INDEX "profiles_username_unique_active" ON "public"."profiles" USING "btree" ("username") WHERE ("deleted" = false);



-- NOTE: The "send push notification" webhook trigger on public.notifications is
-- intentionally NOT captured here — its definition embeds secret HTTP headers.
-- It is managed directly against the database (see SECURITY_ACTIONS.md); the
-- current definition sends x-webhook-secret to the push edge function.



ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_blocked_id_fkey" FOREIGN KEY ("blocked_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."blocks"
    ADD CONSTRAINT "blocks_blocker_id_fkey" FOREIGN KEY ("blocker_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."comments"
    ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."followers"
    ADD CONSTRAINT "followers_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."likes"
    ADD CONSTRAINT "likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."notification_types"("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reports"
    ADD CONSTRAINT "reports_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "public"."reviews"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_location_fkey" FOREIGN KEY ("location") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_location_id_fkey" FOREIGN KEY ("location") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_spirit_fkey" FOREIGN KEY ("spirit") REFERENCES "public"."spirits"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_state_fkey" FOREIGN KEY ("state") REFERENCES "public"."review_states"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_type_fkey" FOREIGN KEY ("type") REFERENCES "public"."types"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_user_id_fkey1" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



CREATE POLICY "Allow authenticated users to update locations" ON "public"."locations" FOR UPDATE TO "authenticated" USING (true) WITH CHECK (true);



CREATE POLICY "Allow delete likes" ON "public"."likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow insert likes" ON "public"."likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Allow insert notifications for authenticated users" ON "public"."notifications" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Allow inserting own follower" ON "public"."followers" FOR INSERT WITH CHECK ((("auth"."uid"() = "follower_id") AND ("follower_id" <> "following_id")));



CREATE POLICY "Allow public inserts into notifications" ON "public"."notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Allow public read of profiles" ON "public"."profiles" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Allow public select on followers" ON "public"."followers" FOR SELECT USING (true);



CREATE POLICY "Allow public select on profiles" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow read access to all users" ON "public"."locations" FOR SELECT USING (true);



CREATE POLICY "Allow read access to all users" ON "public"."spirits" FOR SELECT USING (true);



CREATE POLICY "Allow read access to all users" ON "public"."types" FOR SELECT USING (true);



CREATE POLICY "Allow select for anon" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Allow select for followers and followings" ON "public"."followers" FOR SELECT USING ((("auth"."uid"() = "follower_id") OR ("auth"."uid"() = "following_id")));



CREATE POLICY "Allow select likes" ON "public"."likes" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Allow service role to update locations" ON "public"."locations" FOR UPDATE TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "Authenticated users can read their profiles" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Authenticated users can update their profiles" ON "public"."profiles" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "id"));



CREATE POLICY "Delete own follower row" ON "public"."followers" FOR DELETE USING (("auth"."uid"() = "follower_id"));



CREATE POLICY "Individuals can create locations." ON "public"."locations" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Individuals can create reviews." ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Individuals can delete their own reviews." ON "public"."reviews" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Individuals can update their own reviews." ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Individuals can view their own reviews. " ON "public"."reviews" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Public read profiles" ON "public"."profiles" FOR SELECT;



CREATE POLICY "Public read reviews" ON "public"."reviews" FOR SELECT USING (("state" = 1));



CREATE POLICY "Users can create blocks" ON "public"."blocks" FOR INSERT WITH CHECK (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can delete their own blocks" ON "public"."blocks" FOR DELETE USING (("auth"."uid"() = "blocker_id"));



CREATE POLICY "Users can view their own blocks" ON "public"."blocks" FOR SELECT USING ((("auth"."uid"() = "blocker_id") OR ("auth"."uid"() = "blocked_id")));



ALTER TABLE "public"."blocks" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."followers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."likes" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_types" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."review_states" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."spirits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."types" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "gis" TO "authenticated";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

















































































































































































GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."locations_in_view"("min_lat" double precision, "min_long" double precision, "max_lat" double precision, "max_long" double precision) TO "anon";
GRANT ALL ON FUNCTION "public"."locations_in_view"("min_lat" double precision, "min_long" double precision, "max_lat" double precision, "max_long" double precision) TO "authenticated";
GRANT ALL ON FUNCTION "public"."locations_in_view"("min_lat" double precision, "min_long" double precision, "max_lat" double precision, "max_long" double precision) TO "service_role";



GRANT ALL ON FUNCTION "public"."top_locations"() TO "anon";
GRANT ALL ON FUNCTION "public"."top_locations"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."top_locations"() TO "service_role";



GRANT ALL ON FUNCTION "public"."top_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."top_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."top_profiles"() TO "service_role";


















GRANT ALL ON TABLE "public"."blocks" TO "anon";
GRANT ALL ON TABLE "public"."blocks" TO "authenticated";
GRANT ALL ON TABLE "public"."blocks" TO "service_role";



GRANT ALL ON TABLE "public"."comments" TO "anon";
GRANT ALL ON TABLE "public"."comments" TO "authenticated";
GRANT ALL ON TABLE "public"."comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."followers" TO "anon";
GRANT ALL ON TABLE "public"."followers" TO "authenticated";
GRANT ALL ON TABLE "public"."followers" TO "service_role";



GRANT ALL ON TABLE "public"."likes" TO "anon";
GRANT ALL ON TABLE "public"."likes" TO "authenticated";
GRANT ALL ON TABLE "public"."likes" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."location_ratings" TO "anon";
GRANT ALL ON TABLE "public"."location_ratings" TO "authenticated";
GRANT ALL ON TABLE "public"."location_ratings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_types" TO "anon";
GRANT ALL ON TABLE "public"."notification_types" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_types_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reports" TO "anon";
GRANT ALL ON TABLE "public"."reports" TO "authenticated";
GRANT ALL ON TABLE "public"."reports" TO "service_role";



GRANT ALL ON TABLE "public"."review_states" TO "anon";
GRANT ALL ON TABLE "public"."review_states" TO "authenticated";
GRANT ALL ON TABLE "public"."review_states" TO "service_role";



GRANT ALL ON SEQUENCE "public"."review_states_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."review_states_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."review_states_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."reviews_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."spirits" TO "anon";
GRANT ALL ON TABLE "public"."spirits" TO "authenticated";
GRANT ALL ON TABLE "public"."spirits" TO "service_role";



GRANT ALL ON SEQUENCE "public"."spirits_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."spirits_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."spirits_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."types" TO "anon";
GRANT ALL ON TABLE "public"."types" TO "authenticated";
GRANT ALL ON TABLE "public"."types" TO "service_role";



GRANT ALL ON SEQUENCE "public"."types_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."types_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."types_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS  TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES  TO "service_role";






























CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

  create policy "read review images f3q3wf_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'review_images'::text));



  create policy "review images"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check ((bucket_id = 'review_images'::text));



  create policy "user avatars 1oj01fe_0"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "user avatars 1oj01fe_1"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'avatars'::text));



  create policy "user avatars 1oj01fe_2"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'avatars'::text));
