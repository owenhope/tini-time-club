-- 'Active' now also counts opening the app, not only reviewing: presence
-- heartbeats (app_usage_presence) began 2026-08-22, so the review clause
-- covers members whose last open predates tracking.
CREATE FUNCTION public.admin_email_member_is_active(p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (SELECT 1 FROM public.reviews r
      WHERE r.user_id = p_profile_id AND r.inserted_at >= now() - interval '90 days')
    OR EXISTS (SELECT 1 FROM public.app_usage_presence u
      WHERE u.user_id = p_profile_id AND u.last_seen_at >= now() - interval '90 days');
$$;

CREATE OR REPLACE FUNCTION public.admin_email_segment_matches(p_segment text, p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE p_segment
    WHEN 'active' THEN public.admin_email_member_is_active(p_profile_id)
    WHEN 'inactive' THEN NOT public.admin_email_member_is_active(p_profile_id)
    ELSE true
  END;
$$;

REVOKE ALL ON FUNCTION public.admin_email_member_is_active(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_email_member_is_active(uuid) TO service_role;
