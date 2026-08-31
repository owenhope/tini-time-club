-- Location claims, manual verification periods, and private manager periods.
-- This is the additive rollout. The legacy authenticated locations UPDATE
-- policy remains in place until every supported client uses the resolver RPC.

BEGIN;

CREATE TABLE IF NOT EXISTS public.location_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id bigint NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  requester_profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact_name text,
  account_email text,
  business_email text,
  business_role text NOT NULL,
  phone text,
  explanation text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  decided_at timestamptz,
  rejection_reason text,
  admin_notes text,
  superseded_by_claim_id uuid REFERENCES public.location_claims(id),
  requester_redacted_at timestamptz,
  CONSTRAINT location_claims_business_email_check CHECK (
    business_email IS NULL OR (
      length(trim(business_email)) BETWEEN 3 AND 320
      AND position('@' IN trim(business_email)) > 1
    )
  ),
  CONSTRAINT location_claims_role_check CHECK (
    length(trim(business_role)) BETWEEN 1 AND 80
  ),
  CONSTRAINT location_claims_phone_check CHECK (
    phone IS NULL OR length(trim(phone)) BETWEEN 1 AND 40
  ),
  CONSTRAINT location_claims_explanation_check CHECK (
    explanation IS NULL OR length(trim(explanation)) BETWEEN 1 AND 1000
  ),
  CONSTRAINT location_claims_rejection_reason_check CHECK (
    (status = 'rejected' AND rejection_reason IS NOT NULL
      AND length(trim(rejection_reason)) BETWEEN 1 AND 1000)
    OR (status <> 'rejected' AND rejection_reason IS NULL)
  ),
  CONSTRAINT location_claims_state_fields_check CHECK (
    (status = 'pending' AND decided_at IS NULL
      AND superseded_by_claim_id IS NULL)
    OR (status IN ('approved', 'rejected') AND decided_at IS NOT NULL
      AND superseded_by_claim_id IS NULL)
    OR (status = 'superseded' AND decided_at IS NOT NULL
      AND superseded_by_claim_id IS NOT NULL AND superseded_by_claim_id <> id)
  )
);

CREATE TABLE IF NOT EXISTS public.location_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id bigint NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  source_claim_id uuid NOT NULL REFERENCES public.location_claims(id),
  restored_from_verification_id uuid
    REFERENCES public.location_verifications(id),
  verified_at timestamptz NOT NULL DEFAULT now(),
  verification_reason text,
  revoked_at timestamptz,
  revocation_reason text,
  CONSTRAINT location_verifications_reason_check CHECK (
    (restored_from_verification_id IS NULL AND verification_reason IS NULL)
    OR (restored_from_verification_id IS NOT NULL
      AND verification_reason IS NOT NULL
      AND length(trim(verification_reason)) BETWEEN 1 AND 1000)
  ),
  CONSTRAINT location_verifications_revocation_check CHECK (
    (revoked_at IS NULL AND revocation_reason IS NULL)
    OR (revoked_at IS NOT NULL AND revocation_reason IS NOT NULL
      AND length(trim(revocation_reason)) BETWEEN 1 AND 1000)
  )
);

CREATE TABLE IF NOT EXISTS public.location_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id bigint NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  profile_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'removed')),
  added_at timestamptz NOT NULL DEFAULT now(),
  removed_at timestamptz,
  removal_reason text,
  CONSTRAINT location_managers_state_check CHECK (
    (status = 'active' AND removed_at IS NULL)
    OR (status = 'removed' AND removed_at IS NOT NULL)
  ),
  CONSTRAINT location_managers_removal_reason_check CHECK (
    removal_reason IS NULL OR length(trim(removal_reason)) BETWEEN 1 AND 1000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS location_claims_pending_requester_unique_idx
  ON public.location_claims(location_id, requester_profile_id)
  WHERE status = 'pending' AND requester_profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS location_claims_pending_queue_idx
  ON public.location_claims(status, submitted_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS location_claims_location_history_idx
  ON public.location_claims(location_id, submitted_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS location_claims_requester_history_idx
  ON public.location_claims(requester_profile_id, submitted_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS location_claims_rejection_cooldown_idx
  ON public.location_claims(requester_profile_id, location_id, status, decided_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS location_verifications_one_active_idx
  ON public.location_verifications(location_id)
  WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS location_verifications_location_history_idx
  ON public.location_verifications(location_id, verified_at DESC, id DESC);
CREATE UNIQUE INDEX IF NOT EXISTS location_managers_active_pair_unique_idx
  ON public.location_managers(location_id, profile_id)
  WHERE status = 'active' AND profile_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS location_managers_location_history_idx
  ON public.location_managers(location_id, added_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS location_managers_profile_history_idx
  ON public.location_managers(profile_id, added_at DESC, id DESC);

ALTER TABLE public.location_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.location_managers ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.location_claims,
  public.location_verifications, public.location_managers FROM anon, authenticated;
GRANT ALL ON TABLE public.location_claims,
  public.location_verifications, public.location_managers TO service_role;

CREATE OR REPLACE FUNCTION public.is_location_verified(p_location_id bigint)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.location_verifications verification
    WHERE verification.location_id = p_location_id
      AND verification.revoked_at IS NULL
  );
$$;

REVOKE ALL ON FUNCTION public.is_location_verified(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_location_verified(bigint)
  TO anon, authenticated, service_role;

-- Keep the view as the single public identity projection. The new field is
-- appended so existing clients can continue decoding the older columns.
CREATE OR REPLACE VIEW public.location_ratings AS
SELECT
  l.id,
  l.name,
  l.address,
  l.neighborhood,
  l.region_id,
  gis.st_y((l.location)::gis.geometry) AS lat,
  gis.st_x((l.location)::gis.geometry) AS lon,
  COALESCE(round(avg(((r.taste + r.presentation) / 2.0)), 1), 0)::numeric AS rating,
  COALESCE(round(avg(r.taste), 1), 0)::numeric AS taste_avg,
  COALESCE(round(avg(r.presentation), 1), 0)::numeric AS presentation_avg,
  count(r.id)::integer AS total_ratings,
  public.is_golden_glass_location(l.id) AS is_golden_glass,
  public.is_location_verified(l.id) AS is_location_verified
FROM public.locations l
LEFT JOIN public.reviews r
  ON l.id = r.location AND r.state = 1
GROUP BY l.id, l.name, l.address, l.neighborhood, l.region_id, l.location;

ALTER VIEW public.location_ratings SET (security_invoker = on);
REVOKE ALL ON public.location_ratings FROM anon, authenticated;
GRANT SELECT ON public.location_ratings TO anon, authenticated, service_role;

-- Narrow member location resolver. It deliberately ignores any client-supplied
-- user id and never overwrites canonical location identity fields.
CREATE OR REPLACE FUNCTION public.resolve_or_create_location(
  p_name text,
  p_address text DEFAULT NULL,
  p_place_id text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  name text,
  address text,
  place_id text,
  latitude double precision,
  longitude double precision
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, gis, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_name text := NULLIF(trim(p_name), '');
  v_address text := NULLIF(trim(p_address), '');
  v_place_id text := NULLIF(trim(p_place_id), '');
  v_location_id bigint;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;
  IF v_name IS NULL OR length(v_name) > 160 THEN
    RAISE EXCEPTION 'A valid location name is required' USING ERRCODE = '22023';
  END IF;
  IF v_address IS NOT NULL AND length(v_address) > 300 THEN
    RAISE EXCEPTION 'Location address is too long' USING ERRCODE = '22023';
  END IF;
  IF v_place_id IS NOT NULL AND length(v_place_id) > 255 THEN
    RAISE EXCEPTION 'Google place ID is too long' USING ERRCODE = '22023';
  END IF;
  IF (p_latitude IS NULL) IS DISTINCT FROM (p_longitude IS NULL)
     OR p_latitude IS NOT NULL AND (
       p_latitude NOT BETWEEN -90 AND 90
       OR p_longitude NOT BETWEEN -180 AND 180
     ) THEN
    RAISE EXCEPTION 'Location coordinates are invalid' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'resolve-location:' || COALESCE(v_place_id, lower(v_name) || '|' || lower(COALESCE(v_address, ''))),
    0
  ));

  IF v_place_id IS NOT NULL THEN
    SELECT l.id INTO v_location_id
    FROM public.locations l
    WHERE l.place_id = v_place_id
    ORDER BY l.id
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_location_id IS NULL THEN
    SELECT l.id INTO v_location_id
    FROM public.locations l
    WHERE lower(trim(COALESCE(l.name, ''))) = lower(v_name)
      AND lower(trim(COALESCE(l.address, ''))) = lower(COALESCE(v_address, ''))
    ORDER BY l.id
    LIMIT 1
    FOR UPDATE;
  END IF;

  IF v_location_id IS NULL THEN
    IF p_latitude IS NULL OR p_longitude IS NULL THEN
      RAISE EXCEPTION 'Coordinates are required for a new location'
        USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.locations (name, address, place_id, location, created_by)
    VALUES (
      v_name,
      v_address,
      v_place_id,
      gis.st_setsrid(gis.st_makepoint(p_longitude, p_latitude), 4326)::gis.geography,
      v_user_id
    )
    RETURNING locations.id INTO v_location_id;
  ELSIF v_place_id IS NOT NULL THEN
    UPDATE public.locations
    SET place_id = v_place_id
    WHERE locations.id = v_location_id
      AND locations.place_id IS NULL;
  END IF;

  RETURN QUERY
  SELECT l.id, l.name, l.address, l.place_id,
    gis.st_y((l.location)::gis.geometry),
    gis.st_x((l.location)::gis.geometry)
  FROM public.locations l
  WHERE l.id = v_location_id;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_or_create_location(
  text, text, text, double precision, double precision
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_or_create_location(
  text, text, text, double precision, double precision
) TO authenticated;

CREATE OR REPLACE FUNCTION public.submit_location_claim(
  p_location_id bigint,
  p_business_role text,
  p_business_email text,
  p_phone text DEFAULT NULL,
  p_explanation text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_email text;
  v_claim public.location_claims%ROWTYPE;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id AND deleted = false
  FOR UPDATE;
  IF NOT FOUND OR NULLIF(trim(COALESCE(v_profile.username, '')), '') IS NULL
     OR v_profile.eula_accepted IS NOT TRUE THEN
    RAISE EXCEPTION 'A completed member profile is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT u.email INTO v_email FROM auth.users u WHERE u.id = v_user_id;
  IF NULLIF(trim(COALESCE(v_email, '')), '') IS NULL
     OR (SELECT email_confirmed_at FROM auth.users WHERE id = v_user_id) IS NULL THEN
    RAISE EXCEPTION 'A confirmed account email is required'
      USING ERRCODE = '42501';
  END IF;
  IF NULLIF(trim(p_business_role), '') IS NULL
     OR length(trim(p_business_role)) > 80 THEN
    RAISE EXCEPTION 'Enter your role at the business' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(p_business_email), '') IS NULL
     OR length(trim(p_business_email)) > 320
     OR position('@' IN trim(p_business_email)) <= 1 THEN
    RAISE EXCEPTION 'Enter a valid business email' USING ERRCODE = '22023';
  END IF;
  IF p_phone IS NOT NULL AND length(trim(p_phone)) > 40 THEN
    RAISE EXCEPTION 'Phone number is too long' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(p_explanation), '') IS NULL
     OR length(trim(p_explanation)) > 1000 THEN
    RAISE EXCEPTION 'Enter a short explanation' USING ERRCODE = '22023';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(
    'location-claim:' || v_user_id::text || ':' || COALESCE(p_location_id::text, ''),
    0
  ));

  PERFORM 1 FROM public.locations l WHERE l.id = p_location_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected location does not exist' USING ERRCODE = '23503';
  END IF;
  IF public.is_location_verified(p_location_id) THEN
    RAISE EXCEPTION 'This location is already verified' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.location_claims c
    WHERE c.location_id = p_location_id
      AND c.requester_profile_id = v_user_id
      AND c.status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending claim for this location'
      USING ERRCODE = '23505';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.location_claims c
    WHERE c.location_id = p_location_id
      AND c.requester_profile_id = v_user_id
      AND c.status = 'rejected'
      AND c.decided_at > now() - interval '7 days'
  ) THEN
    RAISE EXCEPTION 'A rejected claim is still within its seven-day cooldown'
      USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.location_claims (
    location_id, requester_profile_id, contact_name, account_email,
    business_email, business_role, phone, explanation
  ) VALUES (
    p_location_id,
    v_user_id,
    NULLIF(trim(COALESCE(v_profile.name, v_profile.username)), ''),
    lower(trim(v_email)),
    lower(trim(p_business_email)),
    trim(p_business_role),
    NULLIF(trim(p_phone), ''),
    trim(p_explanation)
  )
  RETURNING * INTO v_claim;

  RETURN jsonb_build_object(
    'id', v_claim.id,
    'locationId', v_claim.location_id,
    'status', v_claim.status,
    'submittedAt', v_claim.submitted_at
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_location_claim(
  bigint, text, text, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_location_claim(
  bigint, text, text, text, text
) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_location_claim_status(p_location_id bigint)
RETURNS TABLE (
  id uuid,
  location_id bigint,
  status text,
  submitted_at timestamptz,
  decided_at timestamptz,
  rejection_reason text,
  superseded_by_claim_id uuid,
  resubmission_at timestamptz,
  can_resubmit boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT c.id, c.location_id, c.status, c.submitted_at, c.decided_at,
    c.rejection_reason, c.superseded_by_claim_id,
    CASE WHEN c.status = 'rejected' THEN c.decided_at + interval '7 days' END,
    c.status <> 'rejected' OR c.decided_at + interval '7 days' <= now()
  FROM public.location_claims c
  WHERE c.location_id = p_location_id
    AND c.requester_profile_id = auth.uid()
    AND auth.uid() IS NOT NULL
  ORDER BY c.submitted_at DESC, c.id DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_my_location_claim_status(bigint) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_location_claim_status(bigint) TO authenticated;

CREATE OR REPLACE FUNCTION public.location_claim_notification(
  p_profile_id uuid,
  p_claim_id uuid,
  p_location_id bigint,
  p_body text,
  p_status text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_profile_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.notifications (
    user_id, body, type, kind, data, event_key
  ) VALUES (
    p_profile_id,
    p_body,
    2,
    'admin_message',
    jsonb_build_object(
      'kind', 'admin_message',
      'claimId', p_claim_id,
      'locationId', p_location_id,
      'claimStatus', p_status,
      'url', '/places/' || p_location_id::text
    ),
    'location-claim:' || p_claim_id::text || ':' || p_status
  ) ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.location_claim_notification(
  uuid, uuid, bigint, text, text
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.location_claim_notification(
  uuid, uuid, bigint, text, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.approve_location_claim(p_claim_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_claim public.location_claims%ROWTYPE;
  v_other public.location_claims%ROWTYPE;
  v_verification_id uuid;
BEGIN
  SELECT * INTO v_claim FROM public.location_claims
  WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND OR v_claim.status <> 'pending' THEN
    RAISE EXCEPTION 'Only a pending claim can be approved' USING ERRCODE = '23514';
  END IF;
  PERFORM 1 FROM public.locations WHERE id = v_claim.location_id FOR UPDATE;
  IF public.is_location_verified(v_claim.location_id) THEN
    RAISE EXCEPTION 'The location is already verified' USING ERRCODE = '23514';
  END IF;

  UPDATE public.location_claims
  SET status = 'approved', decided_at = now()
  WHERE id = v_claim.id;

  INSERT INTO public.location_verifications (location_id, source_claim_id)
  VALUES (v_claim.location_id, v_claim.id)
  RETURNING id INTO v_verification_id;

  FOR v_other IN
    SELECT * FROM public.location_claims
    WHERE location_id = v_claim.location_id
      AND status = 'pending'
      AND id <> v_claim.id
    ORDER BY submitted_at, id
    FOR UPDATE
  LOOP
    UPDATE public.location_claims
    SET status = 'superseded', decided_at = now(),
      superseded_by_claim_id = v_claim.id
    WHERE id = v_other.id;
    PERFORM public.location_claim_notification(
      v_other.requester_profile_id,
      v_other.id,
      v_other.location_id,
      'This location was already verified. Your claim did not grant management access.',
      'superseded'
    );
  END LOOP;

  PERFORM public.location_claim_notification(
    v_claim.requester_profile_id,
    v_claim.id,
    v_claim.location_id,
    'This location is now verified by Tini Time Club. Verification does not grant manager access.',
    'approved'
  );
  RETURN jsonb_build_object(
    'claimId', v_claim.id,
    'locationId', v_claim.location_id,
    'verificationId', v_verification_id,
    'status', 'approved'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_location_claim(
  p_claim_id uuid,
  p_rejection_reason text,
  p_admin_notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_claim public.location_claims%ROWTYPE;
BEGIN
  IF NULLIF(trim(p_rejection_reason), '') IS NULL
     OR length(trim(p_rejection_reason)) > 1000 THEN
    RAISE EXCEPTION 'A rejection reason is required' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_claim FROM public.location_claims
  WHERE id = p_claim_id FOR UPDATE;
  IF NOT FOUND OR v_claim.status <> 'pending' THEN
    RAISE EXCEPTION 'Only a pending claim can be rejected' USING ERRCODE = '23514';
  END IF;
  UPDATE public.location_claims
  SET status = 'rejected', decided_at = now(),
    rejection_reason = trim(p_rejection_reason),
    admin_notes = NULLIF(trim(p_admin_notes), '')
  WHERE id = p_claim_id;
  PERFORM public.location_claim_notification(
    v_claim.requester_profile_id,
    v_claim.id,
    v_claim.location_id,
    'Your location claim needs attention. Open Tini Time Club to review the decision.',
    'rejected'
  );
  RETURN jsonb_build_object('claimId', v_claim.id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.revoke_location_verification(
  p_location_id bigint,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  IF NULLIF(trim(p_reason), '') IS NULL OR length(trim(p_reason)) > 1000 THEN
    RAISE EXCEPTION 'A revocation reason is required' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.locations WHERE id = p_location_id FOR UPDATE;
  UPDATE public.location_verifications
  SET revoked_at = now(), revocation_reason = trim(p_reason)
  WHERE location_id = p_location_id AND revoked_at IS NULL
  RETURNING id INTO v_id;
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'The location is not currently verified' USING ERRCODE = '23514';
  END IF;
  RETURN jsonb_build_object('locationId', p_location_id, 'verificationId', v_id,
    'status', 'revoked');
END;
$$;

CREATE OR REPLACE FUNCTION public.restore_location_verification(
  p_location_id bigint,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_prior public.location_verifications%ROWTYPE; v_id uuid;
BEGIN
  IF NULLIF(trim(p_reason), '') IS NULL OR length(trim(p_reason)) > 1000 THEN
    RAISE EXCEPTION 'A restoration reason is required' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.locations WHERE id = p_location_id FOR UPDATE;
  IF public.is_location_verified(p_location_id) THEN
    RAISE EXCEPTION 'The location is already verified' USING ERRCODE = '23514';
  END IF;
  SELECT * INTO v_prior FROM public.location_verifications
  WHERE location_id = p_location_id AND revoked_at IS NOT NULL
  ORDER BY revoked_at DESC, id DESC LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No revoked verification exists for this location' USING ERRCODE = '23514';
  END IF;
  INSERT INTO public.location_verifications (
    location_id, source_claim_id, restored_from_verification_id, verification_reason
  ) VALUES (p_location_id, v_prior.source_claim_id, v_prior.id, trim(p_reason))
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('locationId', p_location_id, 'verificationId', v_id,
    'status', 'restored');
END;
$$;

CREATE OR REPLACE FUNCTION public.add_location_manager(
  p_location_id bigint,
  p_profile_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM 1 FROM public.locations WHERE id = p_location_id FOR UPDATE;
  IF NOT FOUND OR NOT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_profile_id AND deleted = false
  ) THEN
    RAISE EXCEPTION 'The location or member does not exist' USING ERRCODE = '23503';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.location_managers
    WHERE location_id = p_location_id AND profile_id = p_profile_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'This member is already a manager for the location' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.location_managers (location_id, profile_id)
  VALUES (p_location_id, p_profile_id) RETURNING id INTO v_id;
  RETURN jsonb_build_object('id', v_id, 'locationId', p_location_id,
    'profileId', p_profile_id, 'status', 'active');
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_location_manager(
  p_manager_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE v_location_id bigint; v_profile_id uuid;
BEGIN
  IF p_reason IS NOT NULL AND length(trim(p_reason)) > 1000 THEN
    RAISE EXCEPTION 'Removal reason is too long' USING ERRCODE = '22023';
  END IF;
  UPDATE public.location_managers
  SET status = 'removed', removed_at = now(),
    removal_reason = NULLIF(trim(p_reason), '')
  WHERE id = p_manager_id AND status = 'active'
  RETURNING location_id, profile_id INTO v_location_id, v_profile_id;
  IF v_location_id IS NULL THEN
    RAISE EXCEPTION 'The active manager assignment does not exist' USING ERRCODE = '23514';
  END IF;
  RETURN jsonb_build_object('id', p_manager_id, 'locationId', v_location_id,
    'profileId', v_profile_id, 'status', 'removed');
END;
$$;

REVOKE ALL ON FUNCTION public.approve_location_claim(uuid),
  public.reject_location_claim(uuid, text, text),
  public.revoke_location_verification(bigint, text),
  public.restore_location_verification(bigint, text),
  public.add_location_manager(bigint, uuid),
  public.remove_location_manager(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.approve_location_claim(uuid),
  public.reject_location_claim(uuid, text, text),
  public.revoke_location_verification(bigint, text),
  public.restore_location_verification(bigint, text),
  public.add_location_manager(bigint, uuid),
  public.remove_location_manager(uuid, text) TO service_role;

-- Server-only queue/detail projections. They are JSON so the app never needs
-- table grants to retrieve claim contact snapshots or admin notes.
CREATE OR REPLACE FUNCTION public.get_admin_location_claims_page(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH filtered AS (
    SELECT c.*, l.name AS location_name, l.address AS location_address,
      p.id AS profile_id, p.username, p.name AS profile_name
    FROM public.location_claims c
    JOIN public.locations l ON l.id = c.location_id
    LEFT JOIN public.profiles p ON p.id = c.requester_profile_id
    WHERE (p_status IS NULL OR p_status = '' OR c.status = p_status)
      AND (p_search IS NULL OR p_search = '' OR (
        l.name ILIKE '%' || p_search || '%'
        OR COALESCE(l.address, '') ILIKE '%' || p_search || '%'
        OR COALESCE(p.username, '') ILIKE '%' || p_search || '%'
        OR COALESCE(c.account_email, '') ILIKE '%' || p_search || '%'
        OR COALESCE(c.business_email, '') ILIKE '%' || p_search || '%'
      ))
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
      submitted_at DESC, id DESC
    LIMIT greatest(1, least(COALESCE(p_per_page, 50), 100))
    OFFSET greatest(COALESCE(p_page, 1) - 1, 0) * greatest(1, least(COALESCE(p_per_page, 50), 100))
  )
  SELECT jsonb_build_object(
    'claims', COALESCE((SELECT jsonb_agg(to_jsonb(paged) ORDER BY submitted_at DESC, id DESC) FROM paged), '[]'::jsonb),
    'total', (SELECT count(*) FROM filtered),
    'pendingCount', (SELECT count(*) FROM public.location_claims WHERE status = 'pending')
  );
$$;

CREATE OR REPLACE FUNCTION public.get_admin_location_claim_detail(p_claim_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'claim', to_jsonb(claim),
    'location', jsonb_build_object('id', location.id, 'name', location.name,
      'address', location.address, 'place_id', location.place_id),
    'previousClaims', COALESCE((
      SELECT jsonb_agg(to_jsonb(previous) ORDER BY previous.submitted_at DESC)
      FROM public.location_claims previous
      WHERE previous.location_id = claim.location_id AND previous.id <> claim.id
    ), '[]'::jsonb),
    'verifications', COALESCE((
      SELECT jsonb_agg(to_jsonb(verification) ORDER BY verification.verified_at DESC)
      FROM public.location_verifications verification
      WHERE verification.location_id = claim.location_id
    ), '[]'::jsonb),
    'managers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', manager.id, 'location_id', manager.location_id,
        'profile_id', manager.profile_id, 'status', manager.status,
        'added_at', manager.added_at, 'removed_at', manager.removed_at,
        'removal_reason', manager.removal_reason,
        'username', profile.username, 'profile_name', profile.name
      ) ORDER BY manager.added_at DESC)
      FROM public.location_managers manager
      LEFT JOIN public.profiles profile ON profile.id = manager.profile_id
      WHERE manager.location_id = claim.location_id
    ), '[]'::jsonb)
  )
  FROM public.location_claims claim
  JOIN public.locations location ON location.id = claim.location_id
  WHERE claim.id = p_claim_id;
$$;

REVOKE ALL ON FUNCTION public.get_admin_location_claims_page(text, text, integer, integer),
  public.get_admin_location_claim_detail(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_location_claims_page(text, text, integer, integer),
  public.get_admin_location_claim_detail(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.find_location_manager_profile(p_query text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', profile.id,
    'username', profile.username,
    'name', profile.name,
    'email', account.email
  ) ORDER BY profile.username), '[]'::jsonb)
  FROM public.profiles profile
  JOIN auth.users account ON account.id = profile.id
  WHERE profile.deleted = false
    AND (lower(profile.username) = lower(trim(p_query))
      OR lower(account.email) = lower(trim(p_query)));
$$;

REVOKE ALL ON FUNCTION public.find_location_manager_profile(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_location_manager_profile(text) TO service_role;

-- The resolver uses the same canonical rules as review publishing for future
-- writes; this overload is retained as a compatibility alias for callers that
-- prefer the explicit v1 naming convention.
CREATE OR REPLACE FUNCTION public.resolve_or_create_location_v1(
  p_name text,
  p_address text DEFAULT NULL,
  p_place_id text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL
)
RETURNS TABLE (
  id bigint,
  name text,
  address text,
  place_id text,
  latitude double precision,
  longitude double precision
)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT * FROM public.resolve_or_create_location(
    p_name, p_address, p_place_id, p_latitude, p_longitude
  );
$$;

REVOKE ALL ON FUNCTION public.resolve_or_create_location_v1(
  text, text, text, double precision, double precision
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_or_create_location_v1(
  text, text, text, double precision, double precision
) TO authenticated;

-- Keep claim snapshots private while allowing account deletion to remain a
-- single service-role transaction. Reviews and existing profile-linked rows
-- retain their prior behavior below.
CREATE OR REPLACE FUNCTION public.delete_account_data(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE public.location_claims
  SET contact_name = NULL,
    account_email = NULL,
    business_email = NULL,
    phone = NULL,
    explanation = NULL,
    requester_redacted_at = COALESCE(requester_redacted_at, now())
  WHERE requester_profile_id = p_user_id;

  UPDATE public.location_managers
  SET status = 'removed', removed_at = COALESCE(removed_at, now()),
    removal_reason = COALESCE(removal_reason, 'account_deleted')
  WHERE profile_id = p_user_id AND status = 'active';

  DELETE FROM public.reports
  WHERE reporter_id = p_user_id OR creator_id = p_user_id
     OR review_id IN (SELECT id FROM public.reviews WHERE user_id = p_user_id)
     OR comment_id IN (SELECT id FROM public.comments WHERE user_id = p_user_id);
  DELETE FROM public.comments WHERE user_id = p_user_id;
  DELETE FROM public.reviews WHERE user_id = p_user_id;
  DELETE FROM public.notifications
  WHERE user_id = p_user_id OR actor_id = p_user_id;
  DELETE FROM public.profiles WHERE id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_account_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_account_data(uuid) TO service_role;

-- Deterministic service-only location merge. This is intentionally a function
-- rather than a raw FK update because claim/verification/manager uniqueness
-- needs reconciliation before the duplicate location can be deleted.
CREATE OR REPLACE FUNCTION public.merge_locations_v1(
  p_duplicate_id bigint,
  p_canonical_id bigint
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_duplicate_claim public.location_claims%ROWTYPE;
  v_keep_claim uuid;
  v_canonical_verified uuid;
  v_duplicate_verified public.location_verifications%ROWTYPE;
  v_duplicate_manager public.location_managers%ROWTYPE;
BEGIN
  IF p_duplicate_id = p_canonical_id THEN
    RAISE EXCEPTION 'A location cannot be merged into itself' USING ERRCODE = '22023';
  END IF;
  PERFORM 1 FROM public.locations WHERE id = p_canonical_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Canonical location does not exist' USING ERRCODE = '23503'; END IF;
  PERFORM 1 FROM public.locations WHERE id = p_duplicate_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Duplicate location does not exist' USING ERRCODE = '23503'; END IF;

  -- Preserve the oldest pending claim for each requester and supersede the
  -- later one before moving the duplicate location's rows.
  FOR v_duplicate_claim IN
    SELECT duplicate_claim.*
    FROM public.location_claims duplicate_claim
    WHERE duplicate_claim.location_id = p_duplicate_id
      AND duplicate_claim.status = 'pending'
      AND EXISTS (
        SELECT 1 FROM public.location_claims canonical_claim
        WHERE canonical_claim.location_id = p_canonical_id
          AND canonical_claim.requester_profile_id = duplicate_claim.requester_profile_id
          AND canonical_claim.status = 'pending'
      )
    ORDER BY duplicate_claim.requester_profile_id, duplicate_claim.submitted_at, duplicate_claim.id
    FOR UPDATE
  LOOP
    SELECT c.id INTO v_keep_claim
    FROM public.location_claims c
    WHERE c.location_id IN (p_duplicate_id, p_canonical_id)
      AND c.requester_profile_id = v_duplicate_claim.requester_profile_id
      AND c.status = 'pending'
    ORDER BY c.submitted_at, c.id
    LIMIT 1;
    IF v_keep_claim <> v_duplicate_claim.id THEN
      UPDATE public.location_claims
      SET status = 'superseded', decided_at = now(), superseded_by_claim_id = v_keep_claim
      WHERE id = v_duplicate_claim.id;
    ELSE
      UPDATE public.location_claims canonical_claim
      SET status = 'superseded', decided_at = now(), superseded_by_claim_id = v_duplicate_claim.id
      WHERE canonical_claim.location_id = p_canonical_id
        AND canonical_claim.requester_profile_id = v_duplicate_claim.requester_profile_id
        AND canonical_claim.status = 'pending';
    END IF;
  END LOOP;
  UPDATE public.location_claims SET location_id = p_canonical_id
  WHERE location_id = p_duplicate_id;

  SELECT id INTO v_canonical_verified FROM public.location_verifications
  WHERE location_id = p_canonical_id AND revoked_at IS NULL LIMIT 1;
  FOR v_duplicate_verified IN
    SELECT * FROM public.location_verifications
    WHERE location_id = p_duplicate_id ORDER BY verified_at, id FOR UPDATE
  LOOP
    IF v_canonical_verified IS NOT NULL AND v_duplicate_verified.revoked_at IS NULL THEN
      UPDATE public.location_verifications
      SET revoked_at = now(), revocation_reason = 'location_merge'
      WHERE id = v_duplicate_verified.id;
    END IF;
    UPDATE public.location_verifications SET location_id = p_canonical_id
    WHERE id = v_duplicate_verified.id;
    IF v_canonical_verified IS NULL AND v_duplicate_verified.revoked_at IS NULL THEN
      v_canonical_verified := v_duplicate_verified.id;
    END IF;
  END LOOP;

  FOR v_duplicate_manager IN
    SELECT duplicate_manager.* FROM public.location_managers duplicate_manager
    WHERE duplicate_manager.location_id = p_duplicate_id
      AND duplicate_manager.status = 'active'
      AND EXISTS (
        SELECT 1 FROM public.location_managers canonical_manager
        WHERE canonical_manager.location_id = p_canonical_id
          AND canonical_manager.profile_id = duplicate_manager.profile_id
          AND canonical_manager.status = 'active'
      )
    ORDER BY duplicate_manager.added_at, duplicate_manager.id FOR UPDATE
  LOOP
    UPDATE public.location_managers
    SET status = 'removed', removed_at = now(), removal_reason = 'location_merge'
    WHERE id = v_duplicate_manager.id;
  END LOOP;
  UPDATE public.location_managers SET location_id = p_canonical_id
  WHERE location_id = p_duplicate_id;

  UPDATE public.reviews SET location = p_canonical_id WHERE location = p_duplicate_id;
  UPDATE public.profiles SET favorite_location_id = p_canonical_id
  WHERE favorite_location_id = p_duplicate_id;
  UPDATE public.notifications notification
  SET data = jsonb_set(
    jsonb_set(notification.data, '{locationId}', to_jsonb(p_canonical_id), false),
    '{url}', to_jsonb('/places/' || p_canonical_id::text), false
  )
  WHERE notification.data ->> 'locationId' = p_duplicate_id::text;
  IF to_regclass('public.regular_memberships') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.regular_memberships WHERE location_id = $1' USING p_duplicate_id;
  END IF;
  DELETE FROM public.locations WHERE id = p_duplicate_id;
  RETURN jsonb_build_object('duplicateId', p_duplicate_id, 'canonicalId', p_canonical_id);
END;
$$;

REVOKE ALL ON FUNCTION public.merge_locations_v1(bigint, bigint)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.merge_locations_v1(bigint, bigint) TO service_role;

-- Extend the existing admin places page projection without changing its
-- paging/sort contract.
CREATE OR REPLACE FUNCTION public.get_admin_locations_page(
  p_search text DEFAULT NULL,
  p_min_reviews integer DEFAULT 0,
  p_sort text DEFAULT 'place',
  p_direction text DEFAULT 'asc',
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
  WITH params AS (
    SELECT NULLIF(btrim(p_search), '') AS search_text,
      greatest(0, COALESCE(p_min_reviews, 0)) AS min_reviews,
      CASE WHEN p_sort IN ('place', 'area', 'rating', 'reviews') THEN p_sort ELSE 'place' END AS sort_column,
      CASE WHEN lower(p_direction) = 'desc' THEN 'desc' ELSE 'asc' END AS sort_direction,
      greatest(1, COALESCE(p_page, 1)) AS page_value,
      greatest(1, least(COALESCE(p_per_page, 50), 100)) AS per_page_value
  ), location_rows AS (
    SELECT location.id, location.name, location.address,
      location.neighborhood, location.region_id,
      location.golden_glass_eligible, location.golden_glass_ineligibility_reason,
      ratings.rating, COALESCE(ratings.total_ratings, 0) AS total_ratings,
      COALESCE(ratings.is_location_verified, false) AS is_location_verified
    FROM public.locations location
    LEFT JOIN public.location_ratings ratings ON ratings.id = location.id
    CROSS JOIN params
    WHERE (params.search_text IS NULL
      OR location.name ILIKE '%' || params.search_text || '%'
      OR location.address ILIKE '%' || params.search_text || '%')
      AND COALESCE(ratings.total_ratings, 0) >= params.min_reviews
  ), paged AS (
    SELECT location_rows.* FROM location_rows CROSS JOIN params
    ORDER BY
      CASE WHEN params.sort_column = 'place' AND params.sort_direction = 'asc' THEN name END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'place' AND params.sort_direction = 'desc' THEN name END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'area' AND params.sort_direction = 'asc' THEN address END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'area' AND params.sort_direction = 'desc' THEN address END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'rating' AND params.sort_direction = 'asc' THEN rating END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'rating' AND params.sort_direction = 'desc' THEN rating END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'reviews' AND params.sort_direction = 'asc' THEN total_ratings END ASC,
      CASE WHEN params.sort_column = 'reviews' AND params.sort_direction = 'desc' THEN total_ratings END DESC,
      name ASC NULLS LAST, id ASC
    LIMIT (SELECT per_page_value FROM params)
    OFFSET ((SELECT page_value FROM params) - 1) * (SELECT per_page_value FROM params)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM location_rows),
    'locations', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', id, 'name', name, 'address', address, 'neighborhood', neighborhood,
      'region_id', region_id, 'golden_glass_eligible', golden_glass_eligible,
      'golden_glass_ineligibility_reason', golden_glass_ineligibility_reason,
      'rating', rating, 'total_ratings', total_ratings,
      'is_location_verified', is_location_verified
    )) FROM paged), '[]'::jsonb)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_admin_locations_page(text, integer, text, text, integer, integer)
  TO service_role;

COMMIT;
