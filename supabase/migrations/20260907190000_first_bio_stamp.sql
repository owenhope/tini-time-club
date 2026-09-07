BEGIN;

-- Fourth one-time "First Steps" profile stamp: writing a short bio earns 10
-- points, like the photo / favorite bar / taste profile stamps. Awards are
-- permanent, so clearing the bio later never claws the stamp back.

ALTER TABLE public.passport_definitions
  DROP CONSTRAINT passport_definitions_metric_check;
ALTER TABLE public.passport_definitions
  ADD CONSTRAINT passport_definitions_metric_check CHECK (metric IN (
    'locations', 'martinis', 'combination', 'type_reviews',
    'spirit_reviews', 'regulars', 'comments', 'likes_received', 'shares',
    'profile_photo', 'favorite_location', 'taste_profile', 'bio'
  ));

INSERT INTO public.passport_definitions
  (key, series, metric, threshold, points, title, unit, hint, artwork_key, display_order)
VALUES
  ('first-bio','Profile','bio',1,10,'First Steps','bio','Write a short bio so the club knows your story.','create-outline',4)
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
      WHEN 'bio' THEN (SELECT CASE WHEN length(trim(coalesce(p.bio, ''))) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
    END
  FROM public.passport_definitions d WHERE d.enabled;
$$;
REVOKE ALL ON FUNCTION public.passport_progress_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passport_progress_v1(uuid) TO service_role;

COMMIT;
