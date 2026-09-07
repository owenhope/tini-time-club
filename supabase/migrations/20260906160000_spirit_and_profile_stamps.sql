BEGIN;

-- Two additions to the Passport catalog:
--
-- 1. Spirits get milestone families of their own, mirroring the per-style
--    milestones: 10/50/100 reviews of each spirit for 10/25/50 points.
--    Until now Vodka/Gin/Vesper only appeared inside the Martini Explorer
--    combos.
-- 2. Three one-time "First Steps" profile stamps (10 points each) reward
--    finishing a profile: a photo, a favorite location, and a taste
--    profile. Awards are permanent, so later clearing a favorite never
--    claws the stamp back.

ALTER TABLE public.passport_definitions
  DROP CONSTRAINT passport_definitions_metric_check;
ALTER TABLE public.passport_definitions
  ADD CONSTRAINT passport_definitions_metric_check CHECK (metric IN (
    'locations', 'martinis', 'combination', 'type_reviews',
    'spirit_reviews', 'regulars', 'comments', 'likes_received', 'shares',
    'profile_photo', 'favorite_location', 'taste_profile'
  ));

-- display_order 150..190 places spirit families between Martini Explorer
-- (100s) and the style milestones (200s) in the Martinis section.
INSERT INTO public.passport_definitions
  (key, series, metric, subject_a, threshold, points, title, unit, hint, artwork_key, display_order)
SELECT 'spirit-' || s.id || '-' || threshold, 'Drinks', 'spirit_reviews', s.id,
  threshold, CASE tier WHEN 1 THEN 10 WHEN 2 THEN 25 ELSE 50 END,
  s.name || ' milestones', 'reviews',
  'Publish ' || threshold || ' ' || s.name || ' reviews. Every active review counts.',
  'wine-outline', 150 + dense_rank() OVER (ORDER BY s.id)::integer * 10 + tier
FROM public.spirits s
CROSS JOIN (VALUES (10,1),(50,2),(100,3)) tiers(threshold,tier)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.passport_definitions
  (key, series, metric, threshold, points, title, unit, hint, artwork_key, display_order)
VALUES
  ('first-photo','Profile','profile_photo',1,10,'First Steps','photo','Add a profile photo so the club knows your face.','person-circle-outline',1),
  ('first-favorite-location','Profile','favorite_location',1,10,'First Steps','favorite bar','Pick the bar you call home on your profile.','storefront-outline',2),
  ('first-taste-profile','Profile','taste_profile',1,10,'First Steps','taste profile','Choose your favorite spirits and Martini styles.','sparkles-outline',3)
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.passport_progress_v1(p_profile_id uuid)
RETURNS TABLE (definition_id uuid, progress integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.id,
    CASE d.metric
      WHEN 'locations' THEN (SELECT count(DISTINCT r.location)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.location IS NOT NULL)
      WHEN 'martinis' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1)
      WHEN 'combination' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.spirit=d.subject_a AND r.type=d.subject_b)
      WHEN 'type_reviews' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.type=d.subject_a)
      WHEN 'spirit_reviews' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.spirit=d.subject_a)
      WHEN 'regulars' THEN (SELECT count(*)::integer FROM public.regular_memberships m WHERE m.profile_id=p_profile_id)
      WHEN 'comments' THEN (SELECT count(*)::integer FROM public.comments c WHERE c.user_id=p_profile_id)
      WHEN 'likes_received' THEN (SELECT count(*)::integer FROM public.likes l JOIN public.reviews r ON r.id=l.review_id WHERE r.user_id=p_profile_id AND r.state=1)
      WHEN 'shares' THEN (SELECT count(*)::integer FROM public.review_share_events s WHERE s.user_id=p_profile_id)
      WHEN 'profile_photo' THEN (SELECT CASE WHEN p.avatar_url IS NOT NULL THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'favorite_location' THEN (SELECT CASE WHEN p.favorite_location_id IS NOT NULL THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'taste_profile' THEN (SELECT CASE WHEN coalesce(jsonb_array_length(p.favorite_spirits),0) > 0 AND coalesce(jsonb_array_length(p.favorite_types),0) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
    END
  FROM public.passport_definitions d WHERE d.enabled;
$$;
REVOKE ALL ON FUNCTION public.passport_progress_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passport_progress_v1(uuid) TO service_role;

COMMIT;
