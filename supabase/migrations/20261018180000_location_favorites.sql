BEGIN;

CREATE TABLE public.location_favorites (
  profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  location_id bigint NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  saved_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (profile_id, location_id)
);
CREATE INDEX location_favorites_page_idx ON public.location_favorites(profile_id, saved_at DESC, location_id DESC);
CREATE INDEX location_favorites_location_idx ON public.location_favorites(location_id);
ALTER TABLE public.location_favorites ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.location_favorites FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.get_location_favorite(p_location_id bigint)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND NOT deleted) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  RETURN EXISTS (SELECT 1 FROM public.location_favorites WHERE profile_id = auth.uid() AND location_id = p_location_id);
END;
$$;

CREATE FUNCTION public.set_location_favorite(p_location_id bigint, p_saved boolean)
RETURNS boolean LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_actor uuid := auth.uid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_actor AND NOT deleted) THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;
  IF p_saved IS NULL THEN RAISE EXCEPTION 'Saved state is required' USING ERRCODE = '22023'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE id = p_location_id) THEN
    RAISE EXCEPTION 'Location is unavailable' USING ERRCODE = '22023';
  END IF;
  -- Match Passport's lock order and serialize this member's concurrent saves.
  PERFORM pg_advisory_xact_lock(hashtextextended('passport:' || v_actor::text, 0));
  IF p_saved THEN
    INSERT INTO public.location_favorites(profile_id, location_id) VALUES (v_actor, p_location_id)
    ON CONFLICT DO NOTHING;
    PERFORM public.reconcile_passport_for_v1(v_actor);
  ELSE
    DELETE FROM public.location_favorites WHERE profile_id = v_actor AND location_id = p_location_id;
  END IF;
  RETURN p_saved;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_favorites(
  p_profile_id uuid,
  p_before_time timestamptz DEFAULT NULL,
  p_before_id bigint DEFAULT NULL
)
RETURNS TABLE(location_id bigint, location_name text, location_address text,
  is_golden_glass boolean, is_location_verified boolean, saved_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND NOT deleted)
    OR NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_profile_id AND NOT deleted)
    OR NOT public.is_member_visible(p_profile_id) THEN
    RAISE EXCEPTION 'Favorites are unavailable' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT l.id, coalesce(l.name, 'Location'), l.address,
    public.is_golden_glass_location(l.id), public.is_location_verified(l.id), f.saved_at
  FROM public.location_favorites f JOIN public.locations l ON l.id = f.location_id
  WHERE f.profile_id = p_profile_id
    AND (p_before_time IS NULL OR (f.saved_at, f.location_id) < (p_before_time, p_before_id))
  ORDER BY f.saved_at DESC, f.location_id DESC LIMIT 31;
END;
$$;

REVOKE ALL ON FUNCTION public.get_location_favorite(bigint), public.set_location_favorite(bigint, boolean), public.get_profile_favorites(uuid, timestamptz, bigint) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_location_favorite(bigint), public.set_location_favorite(bigint, boolean), public.get_profile_favorites(uuid, timestamptz, bigint) TO authenticated;

ALTER TABLE public.passport_definitions DROP CONSTRAINT passport_definitions_metric_check;
ALTER TABLE public.passport_definitions ADD CONSTRAINT passport_definitions_metric_check CHECK (metric IN (
  'locations', 'martinis', 'combination', 'type_reviews', 'spirit_reviews', 'regulars',
  'comments', 'likes_received', 'shares', 'profile_photo', 'favorite_location', 'taste_profile', 'bio', 'favorites'
));
INSERT INTO public.passport_definitions
  (key, series, metric, threshold, points, title, unit, hint, artwork_key, display_order)
SELECT 'favorites-' || threshold, 'Favorites', 'favorites', threshold, points, 'Favorite Places', 'favorites',
  'Star different venues to build your Favorites. Each milestone is earned once; removing a favorite never removes an earned stamp.',
  'star-outline', 450 + ordinal
FROM (VALUES (1,10,1),(5,25,2),(10,50,3),(25,100,4),(50,200,5)) AS tiers(threshold,points,ordinal);

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
      WHEN 'favorites' THEN (SELECT count(*)::integer FROM public.location_favorites f WHERE f.profile_id=p_profile_id)
      WHEN 'regulars' THEN (SELECT count(*)::integer FROM public.regular_memberships m WHERE m.profile_id=p_profile_id)
      WHEN 'comments' THEN (SELECT count(*)::integer FROM public.comments c WHERE c.user_id=p_profile_id)
      WHEN 'likes_received' THEN (SELECT count(*)::integer FROM public.likes l JOIN public.reviews r ON r.id=l.review_id WHERE r.user_id=p_profile_id AND r.state=1)
      WHEN 'shares' THEN (SELECT count(DISTINCT s.review_id)::integer FROM public.review_share_events s WHERE s.user_id=p_profile_id AND s.outcome IN ('opened', 'copied', 'shared', 'completed'))
      WHEN 'profile_photo' THEN (SELECT CASE WHEN p.avatar_url IS NOT NULL THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'favorite_location' THEN (SELECT CASE WHEN p.favorite_location_id IS NOT NULL THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'taste_profile' THEN (SELECT CASE WHEN jsonb_array_length(public.normalize_favorite_ids(p.favorite_spirits)) > 0 AND jsonb_array_length(public.normalize_favorite_ids(p.favorite_types)) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'bio' THEN (SELECT CASE WHEN length(trim(coalesce(p.bio, ''))) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
    END
  FROM public.passport_definitions d WHERE d.enabled;
$$;
REVOKE ALL ON FUNCTION public.passport_progress_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passport_progress_v1(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
