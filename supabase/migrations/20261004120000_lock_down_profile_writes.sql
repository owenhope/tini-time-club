-- Members could rewrite backend-owned profile columns on their own row
-- (is_verified, review_count, follower_count, passport_points, deleted).
--
-- The "update their profiles" RLS policy is row-level only, and the protect_*
-- guard triggers never fired: as SECURITY DEFINER functions owned by postgres,
-- current_user inside them is always 'postgres', so their
-- `current_user <> 'postgres'` test was always false.
--
-- Fix: members may only UPDATE the columns the app edits; everything else is
-- written by definer functions/triggers or the service role. The guards become
-- SECURITY INVOKER so their check sees the real caller (defence in depth).

BEGIN;

ALTER FUNCTION public.protect_profile_verification() SECURITY INVOKER;
ALTER FUNCTION public.protect_profile_review_count() SECURITY INVOKER;
ALTER FUNCTION public.protect_profile_follower_count() SECURITY INVOKER;

-- RLS already blocks member INSERT/DELETE (no policies); drop the unused table
-- privileges along with the table-wide UPDATE.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON public.profiles FROM anon, authenticated;

GRANT UPDATE (
  username,
  name,
  bio,
  avatar_url,
  favorite_spirits,
  favorite_types,
  favorite_location_id,
  is_public,
  weekly_push_notifications_enabled,
  mention_notifications_enabled,
  eula_accepted,
  eula_accepted_at,
  -- Legacy column still written by pre-push_tokens app builds.
  expo_push_token
) ON public.profiles TO authenticated;

COMMIT;
