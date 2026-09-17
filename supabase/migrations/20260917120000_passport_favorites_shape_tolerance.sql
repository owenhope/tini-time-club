BEGIN;

-- Legacy profiles rows store favorite_spirits / favorite_types as a jsonb
-- string scalar (a stringified array) rather than a jsonb array; the app
-- parses both shapes, but passport_progress_v1 called jsonb_array_length
-- directly, which raises "cannot get array length of a scalar" on those
-- rows. That made reconcile_my_passport_v1 (and get_member_passport_v1,
-- which reconciles on view) fail permanently for every legacy-shaped
-- profile. Normalize the stored rows and make the progress function
-- tolerant so a non-array write can never break reconciliation again.

CREATE OR REPLACE FUNCTION public.normalize_favorite_ids(v jsonb)
RETURNS jsonb
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public, pg_temp
AS $$
DECLARE
  parsed jsonb;
BEGIN
  IF v IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;
  IF jsonb_typeof(v) = 'array' THEN
    RETURN v;
  END IF;
  IF jsonb_typeof(v) = 'string' THEN
    BEGIN
      parsed := (v #>> '{}')::jsonb;
    EXCEPTION WHEN others THEN
      RETURN '[]'::jsonb;
    END;
    IF jsonb_typeof(parsed) = 'array' THEN
      RETURN parsed;
    END IF;
  END IF;
  RETURN '[]'::jsonb;
END;
$$;
REVOKE ALL ON FUNCTION public.normalize_favorite_ids(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_favorite_ids(jsonb)
  TO service_role;

UPDATE public.profiles
SET favorite_spirits = public.normalize_favorite_ids(favorite_spirits)
WHERE favorite_spirits IS NOT NULL
  AND jsonb_typeof(favorite_spirits) <> 'array';

UPDATE public.profiles
SET favorite_types = public.normalize_favorite_ids(favorite_types)
WHERE favorite_types IS NOT NULL
  AND jsonb_typeof(favorite_types) <> 'array';

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
      WHEN 'taste_profile' THEN (SELECT CASE WHEN jsonb_array_length(public.normalize_favorite_ids(p.favorite_spirits)) > 0 AND jsonb_array_length(public.normalize_favorite_ids(p.favorite_types)) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'bio' THEN (SELECT CASE WHEN length(trim(coalesce(p.bio, ''))) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
    END
  FROM public.passport_definitions d WHERE d.enabled;
$$;
REVOKE ALL ON FUNCTION public.passport_progress_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passport_progress_v1(uuid) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
