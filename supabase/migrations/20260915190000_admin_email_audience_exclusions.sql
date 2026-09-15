-- Full, deduplicated audience for the admin's editable all-members list.
CREATE FUNCTION public.admin_email_all_members()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
  WITH eligible AS (
    SELECT DISTINCT ON (lower(btrim(u.email))) p.id, p.username, p.name, lower(btrim(u.email)) AS email
    FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.deleted = false AND u.email_confirmed_at IS NOT NULL
      AND u.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      AND NOT EXISTS (SELECT 1 FROM public.admin_email_optouts o WHERE o.email = lower(btrim(u.email)))
    ORDER BY lower(btrim(u.email)), p.id
  ) SELECT coalesce(jsonb_agg(eligible ORDER BY lower(coalesce(username, name, email)), id), '[]'::jsonb) FROM eligible;
$$;
REVOKE ALL ON FUNCTION public.admin_email_all_members() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_email_all_members() TO service_role;

CREATE FUNCTION public.create_admin_email_campaign_excluding(
  p_id uuid, p_subject text, p_body text, p_sender text, p_public_url text,
  p_audience text, p_ids uuid[], p_excluded_ids uuid[]
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
DECLARE inserted_id uuid;
BEGIN
  IF p_audience NOT IN ('selected', 'all') OR p_audience IS NULL THEN
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
      AND (p_audience = 'all' OR p.id = ANY(p_ids))
      AND NOT EXISTS (SELECT 1 FROM auth.users excluded
        WHERE excluded.id = ANY(coalesce(p_excluded_ids, '{}'::uuid[]))
          AND lower(btrim(excluded.email)) = lower(btrim(u.email)))
      AND NOT EXISTS (SELECT 1 FROM public.admin_email_optouts o WHERE o.email = lower(btrim(u.email)))
    ORDER BY lower(btrim(u.email)), p.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No eligible recipients'; END IF;
  RETURN p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_admin_email_campaign_excluding(uuid,text,text,text,text,text,uuid[],uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_admin_email_campaign_excluding(uuid,text,text,text,text,text,uuid[],uuid[]) TO service_role;
