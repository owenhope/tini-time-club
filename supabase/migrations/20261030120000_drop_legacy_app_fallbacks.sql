-- Retire server fallbacks that only pre-4.8 app builds used.
--
-- Production usage (2026-10-29) is 4.8.0 and newer, plus one 4.0.2 install
-- running the later 4.0.2 OTA, which already uses the paged feed/comment
-- RPCs and none of the functions below. Dropped here:
--   - the offset feed RPCs (feed_reviews wrapper, feed_reviews_followed) and
--     get_review_comments, superseded by get_feed_page_v1 / comment pages;
--   - both legacy search_locations signatures and top_profiles, kept only for
--     the original 4.0.2 bundle;
--   - get_region_members_v1 and locations_in_region_view, which no shipped
--     bundle calls (the public region view is unaffected);
--   - resolve_or_create_location_v1 and log_profile_share, never called by
--     any released client;
--   - profiles.expo_push_token, written only by pre-3.1 builds; push uses the
--     push_tokens table.
--
-- feed_reviews calls feed_reviews_followed, so it is dropped first.

BEGIN;

DROP FUNCTION IF EXISTS public.feed_reviews(uuid, integer, integer, uuid, bigint, boolean);
DROP FUNCTION IF EXISTS public.feed_reviews_followed(uuid, integer, integer, uuid, bigint, boolean, boolean);
DROP FUNCTION IF EXISTS public.get_review_comments(bigint);
DROP FUNCTION IF EXISTS public.search_locations(text, integer);
DROP FUNCTION IF EXISTS public.search_locations(text, integer, integer);
DROP FUNCTION IF EXISTS public.top_profiles(integer, text, integer);
DROP FUNCTION IF EXISTS public.get_region_members_v1(bigint, text, integer);
DROP FUNCTION IF EXISTS public.locations_in_region_view(double precision, double precision, double precision, double precision, bigint);
DROP FUNCTION IF EXISTS public.resolve_or_create_location_v1(text, text, text, double precision, double precision);
DROP FUNCTION IF EXISTS public.log_profile_share(uuid, text, text);

ALTER TABLE public.profiles DROP COLUMN IF EXISTS expo_push_token;

COMMIT;
