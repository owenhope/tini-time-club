-- Server-only email drafts, recipient snapshots and delivery ledger.
CREATE TABLE public.admin_email_campaigns (
  id uuid PRIMARY KEY,
  subject text NOT NULL CHECK (length(subject) BETWEEN 1 AND 200),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 20000),
  sender text NOT NULL,
  public_url text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('selected', 'all')),
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz
);

CREATE TABLE public.admin_email_optouts (
  email text PRIMARY KEY CHECK (email = lower(btrim(email))),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.admin_email_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.admin_email_campaigns(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sending', 'sent', 'failed', 'skipped', 'uncertain')),
  first_attempt_at timestamptz,
  lease_until timestamptz,
  provider_id text,
  error_code text,
  UNIQUE (campaign_id, email)
);
CREATE INDEX admin_email_recipients_campaign_status_idx
  ON public.admin_email_recipients(campaign_id, status);

ALTER TABLE public.admin_email_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_optouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_email_recipients ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_email_campaigns, public.admin_email_optouts,
  public.admin_email_recipients FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_email_campaigns, public.admin_email_optouts,
  public.admin_email_recipients TO service_role;

CREATE FUNCTION public.admin_email_audience(p_search text DEFAULT '', p_limit integer DEFAULT 25)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
  WITH eligible AS (
    SELECT p.id, p.username, p.name, lower(btrim(u.email)) AS email
    FROM public.profiles p JOIN auth.users u ON u.id = p.id
    WHERE p.deleted = false AND u.email_confirmed_at IS NOT NULL
      AND u.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      AND NOT EXISTS (SELECT 1 FROM public.admin_email_optouts o WHERE o.email = lower(btrim(u.email)))
  ), matches AS (
    SELECT * FROM eligible
    WHERE p_search <> '' AND (strpos(lower(coalesce(username, '')), lower(p_search)) > 0
      OR strpos(lower(coalesce(name, '')), lower(p_search)) > 0
      OR strpos(email, lower(p_search)) > 0)
    ORDER BY username NULLS LAST, id LIMIT greatest(1, least(p_limit, 50))
  ) SELECT jsonb_build_object('total', (SELECT count(DISTINCT email) FROM eligible),
      'members', coalesce((SELECT jsonb_agg(matches) FROM matches), '[]'::jsonb));
$$;

CREATE FUNCTION public.create_admin_email_campaign(
  p_id uuid, p_subject text, p_body text, p_sender text, p_public_url text,
  p_audience text, p_ids uuid[] DEFAULT '{}'
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
      AND NOT EXISTS (SELECT 1 FROM public.admin_email_optouts o WHERE o.email = lower(btrim(u.email)))
    ORDER BY lower(btrim(u.email)), p.id;
  IF NOT FOUND THEN RAISE EXCEPTION 'No eligible recipients'; END IF;
  RETURN p_id;
END;
$$;

-- Each call claims a small chunk. A crashed request can be resumed with the
-- same Resend idempotency key, but never after its 24-hour retention window.
CREATE FUNCTION public.claim_admin_email_recipients(p_campaign_id uuid)
RETURNS SETOF public.admin_email_recipients LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, pg_temp AS $$
BEGIN
  PERFORM 1 FROM public.admin_email_campaigns WHERE id = p_campaign_id AND started_at IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'Campaign has not been started'; END IF;
  UPDATE public.admin_email_recipients SET status = 'uncertain', error_code = 'retry_window_expired'
    WHERE campaign_id = p_campaign_id AND status = 'sending'
      AND first_attempt_at <= now() - interval '23 hours';
  UPDATE public.admin_email_recipients r SET status = 'skipped', error_code = 'no_longer_eligible'
    WHERE r.campaign_id = p_campaign_id AND r.status = 'pending'
      AND (EXISTS (SELECT 1 FROM public.admin_email_optouts o WHERE o.email = r.email)
        OR NOT EXISTS (SELECT 1 FROM public.profiles p JOIN auth.users u ON u.id = p.id
          WHERE p.id = r.profile_id AND p.deleted = false AND u.email_confirmed_at IS NOT NULL
            AND lower(btrim(u.email)) = r.email));
  RETURN QUERY
    WITH picked AS (
      SELECT id FROM public.admin_email_recipients
      WHERE campaign_id = p_campaign_id
        AND (status = 'pending' OR (status = 'sending' AND lease_until < now()))
      ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 10
    ) UPDATE public.admin_email_recipients r SET status = 'sending',
        first_attempt_at = coalesce(first_attempt_at, now()), lease_until = now() + interval '5 minutes'
      FROM picked WHERE r.id = picked.id RETURNING r.*;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_email_audience(text, integer),
  public.create_admin_email_campaign(uuid, text, text, text, text, text, uuid[]),
  public.claim_admin_email_recipients(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_email_audience(text, integer),
  public.create_admin_email_campaign(uuid, text, text, text, text, text, uuid[]),
  public.claim_admin_email_recipients(uuid) TO service_role;

CREATE FUNCTION public.get_admin_email_campaign(p_id uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT jsonb_build_object('campaign', to_jsonb(c), 'counts', (
    SELECT jsonb_build_object(
      'pending', count(*) FILTER (WHERE status = 'pending'),
      'sending', count(*) FILTER (WHERE status = 'sending'),
      'sent', count(*) FILTER (WHERE status = 'sent'),
      'failed', count(*) FILTER (WHERE status = 'failed'),
      'skipped', count(*) FILTER (WHERE status = 'skipped'),
      'uncertain', count(*) FILTER (WHERE status = 'uncertain'))
    FROM public.admin_email_recipients WHERE campaign_id = c.id
  ), 'recipients', coalesce((SELECT jsonb_agg(r) FROM (
    SELECT id, email, status, provider_id, error_code, lease_until FROM public.admin_email_recipients
    WHERE campaign_id = c.id ORDER BY email LIMIT 50
  ) r), '[]'::jsonb)) FROM public.admin_email_campaigns c WHERE c.id = p_id;
$$;
REVOKE ALL ON FUNCTION public.get_admin_email_campaign(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_email_campaign(uuid) TO service_role;

CREATE FUNCTION public.can_send_admin_email_recipient(p_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_email_recipients r
    JOIN public.profiles p ON p.id = r.profile_id JOIN auth.users u ON u.id = p.id
    WHERE r.id = p_id AND p.deleted = false AND u.email_confirmed_at IS NOT NULL
      AND lower(btrim(u.email)) = r.email
      AND NOT EXISTS (SELECT 1 FROM public.admin_email_optouts o WHERE o.email = r.email)
  );
$$;
REVOKE ALL ON FUNCTION public.can_send_admin_email_recipient(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_send_admin_email_recipient(uuid) TO service_role;
