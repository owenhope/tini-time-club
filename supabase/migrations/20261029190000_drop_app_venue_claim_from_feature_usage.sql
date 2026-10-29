-- The app no longer offers venue verification requests; that flow lives on
-- the website only. Drop its two app screens from the feature-usage catalog
-- so the admin ranking stops listing them as app features.
--
-- Historical events are untouched, and app_analytics_events keeps accepting
-- these names so existing rows (and older app builds still in the wild) stay
-- valid. Idempotent: deleting rows that are already gone is a no-op.

DELETE FROM public.feature_usage_catalog
WHERE surface = 'app'
  AND event_name IN ('screen_location_claim', 'screen_location_verification_info');
