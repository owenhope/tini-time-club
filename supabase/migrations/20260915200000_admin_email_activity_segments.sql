-- Activity-based email audiences: 'active' members reviewed in the last
-- 90 days; 'inactive' members have not (never-reviewed accounts included).
-- The two segments partition 'all', so segment sends cannot double-email.
ALTER TABLE public.admin_email_campaigns DROP CONSTRAINT admin_email_campaigns_audience_check;
ALTER TABLE public.admin_email_campaigns ADD CONSTRAINT admin_email_campaigns_audience_check
  CHECK (audience IN ('selected', 'all', 'active', 'inactive'));

CREATE FUNCTION public.admin_email_segment_matches(p_segment text, p_profile_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE p_segment
    WHEN 'active' THEN EXISTS (SELECT 1 FROM public.reviews r
      WHERE r.user_id = p_profile_id AND r.inserted_at >= now() - interval '90 days')
    WHEN 'inactive' THEN NOT EXISTS (SELECT 1 FROM public.reviews r
      WHERE r.user_id = p_profile_id AND r.inserted_at >= now() - interval '90 days')
    ELSE true
  END;
$$;

-- Replaced (not overloaded) so a bare call cannot become ambiguous.
DROP FUNCTION public.admin_email_all_members();
CREATE FUNCTION public.admin_email_all_members(p_segment text DEFAULT 'all')
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
  WITH eligible AS (
    SELECT DISTINCT ON (lower(btrim(u.email))) p.id, p.username, p.name, lower(btrim(u.email)) AS email
    FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.deleted = false AND u.email_confirmed_at IS NOT NULL
      AND u.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      AND NOT EXISTS (SELECT 1 FROM public.admin_email_optouts o WHERE o.email = lower(btrim(u.email)))
      AND public.admin_email_segment_matches(p_segment, p.id)
    ORDER BY lower(btrim(u.email)), p.id
  ) SELECT coalesce(jsonb_agg(eligible ORDER BY lower(coalesce(username, name, email)), id), '[]'::jsonb) FROM eligible;
$$;

CREATE FUNCTION public.admin_email_audience_counts()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
  WITH eligible AS (
    SELECT DISTINCT ON (lower(btrim(u.email))) p.id
    FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.deleted = false AND u.email_confirmed_at IS NOT NULL
      AND u.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      AND NOT EXISTS (SELECT 1 FROM public.admin_email_optouts o WHERE o.email = lower(btrim(u.email)))
    ORDER BY lower(btrim(u.email)), p.id
  ) SELECT jsonb_build_object(
      'all', count(*),
      'active', count(*) FILTER (WHERE public.admin_email_segment_matches('active', id)),
      'inactive', count(*) FILTER (WHERE public.admin_email_segment_matches('inactive', id)))
    FROM eligible;
$$;

CREATE OR REPLACE FUNCTION public.create_admin_email_campaign_excluding(
  p_id uuid, p_subject text, p_body text, p_sender text, p_public_url text,
  p_audience text, p_ids uuid[], p_excluded_ids uuid[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE inserted_id uuid;
BEGIN
  IF p_audience NOT IN ('selected', 'all', 'active', 'inactive') OR p_audience IS NULL THEN
    RAISE EXCEPTION 'Invalid audience';
  END IF;
  IF p_audience = 'selected' AND coalesce(cardinality(p_ids), 0) = 0 THEN
    RAISE EXCEPTION 'Select at least one member';
  END IF;
  INSERT INTO public.admin_email_campaigns(id, subject, body, sender, public_url, audience)
    VALUES (p_id, btrim(p_subject), btrim(p_body), p_sender, p_public_url, p_audience)
    ON CONFLICT (id) DO NOTHING RETURNING id INTO inserted_id;
  -- A repeated form submission returns its existing immutable draft.
  IF inserted_id IS NULL THEN RETURN p_id; END IF;
  INSERT INTO public.admin_email_recipients(campaign_id, profile_id, email)
    SELECT DISTINCT ON (lower(btrim(u.email))) p_id, p.id, lower(btrim(u.email))
    FROM public.profiles p JOIN auth.users u ON p.id = u.id
    WHERE p.deleted = false AND u.email_confirmed_at IS NOT NULL
      AND u.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      AND (p_audience <> 'selected' OR p.id = ANY(p_ids))
      AND public.admin_email_segment_matches(p_audience, p.id)
      AND NOT EXISTS (SELECT 1 FROM auth.users excluded
        WHERE excluded.id = ANY(coalesce(p_excluded_ids, '{}'::uuid[]))
          AND lower(btrim(excluded.email)) = lower(btrim(u.email)))
      AND NOT EXISTS (SELECT 1 FROM public.admin_email_optouts o WHERE o.email = lower(btrim(u.email)))
    ORDER BY lower(btrim(u.email)), p.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No eligible recipients'; END IF;
  RETURN p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_email_segment_matches(text, uuid),
  public.admin_email_all_members(text), public.admin_email_audience_counts()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_email_segment_matches(text, uuid),
  public.admin_email_all_members(text), public.admin_email_audience_counts()
  TO service_role;
