-- Location-claim notification copy: name the location instead of "This
-- location", and drop the "does not grant manager access" caveat from the
-- member-facing body (that boundary is documented in the claim flow itself).
-- Redefines the three functions that compose the copy and rewrites the
-- bodies of already-delivered notifications to match.

BEGIN;

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
  v_location_name text;
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

  SELECT COALESCE(NULLIF(trim(l.name), ''), 'This location')
  INTO v_location_name
  FROM public.locations l
  WHERE l.id = v_claim.location_id;

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
      v_location_name || ' was already verified, so your claim was closed.',
      'superseded'
    );
  END LOOP;

  PERFORM public.location_claim_notification(
    v_claim.requester_profile_id,
    v_claim.id,
    v_claim.location_id,
    v_location_name || ' is now verified by Tini Time Club.',
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
DECLARE
  v_claim public.location_claims%ROWTYPE;
  v_location_name text;
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

  SELECT COALESCE(NULLIF(trim(l.name), ''), 'this location')
  INTO v_location_name
  FROM public.locations l
  WHERE l.id = v_claim.location_id;

  UPDATE public.location_claims
  SET status = 'rejected', decided_at = now(),
    rejection_reason = trim(p_rejection_reason),
    admin_notes = NULLIF(trim(p_admin_notes), '')
  WHERE id = p_claim_id;
  PERFORM public.location_claim_notification(
    v_claim.requester_profile_id,
    v_claim.id,
    v_claim.location_id,
    'Your claim for ' || v_location_name
      || ' needs attention. Open Tini Time Club to review the decision.',
    'rejected'
  );
  RETURN jsonb_build_object('claimId', v_claim.id, 'status', 'rejected');
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_verify_location(
  p_location_id bigint,
  p_reason text
)
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
  v_reason text := NULLIF(trim(p_reason), '');
  v_location_name text;
BEGIN
  IF v_reason IS NULL OR length(v_reason) > 1000 THEN
    RAISE EXCEPTION 'A verification reason is required' USING ERRCODE = '22023';
  END IF;

  PERFORM 1 FROM public.locations WHERE id = p_location_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The selected location does not exist' USING ERRCODE = '23503';
  END IF;
  IF public.is_location_verified(p_location_id) THEN
    RAISE EXCEPTION 'The location is already verified' USING ERRCODE = '23514';
  END IF;

  SELECT COALESCE(NULLIF(trim(l.name), ''), 'This location')
  INTO v_location_name
  FROM public.locations l
  WHERE l.id = p_location_id;

  INSERT INTO public.location_claims (
    location_id,
    requester_profile_id,
    contact_name,
    business_role,
    explanation,
    status,
    decided_at,
    admin_notes
  ) VALUES (
    p_location_id,
    NULL,
    'Tini Time Club admin',
    'Tini Time Club admin verification',
    'Directly verified by a Tini Time Club administrator.',
    'approved',
    now(),
    v_reason
  )
  RETURNING * INTO v_claim;

  INSERT INTO public.location_verifications (location_id, source_claim_id)
  VALUES (p_location_id, v_claim.id)
  RETURNING id INTO v_verification_id;

  FOR v_other IN
    SELECT * FROM public.location_claims
    WHERE location_id = p_location_id
      AND status = 'pending'
    ORDER BY submitted_at, id
    FOR UPDATE
  LOOP
    UPDATE public.location_claims
    SET status = 'superseded',
      decided_at = now(),
      superseded_by_claim_id = v_claim.id
    WHERE id = v_other.id;

    PERFORM public.location_claim_notification(
      v_other.requester_profile_id,
      v_other.id,
      v_other.location_id,
      v_location_name || ' was already verified, so your claim was closed.',
      'superseded'
    );
  END LOOP;

  RETURN jsonb_build_object(
    'claimId', v_claim.id,
    'locationId', p_location_id,
    'verificationId', v_verification_id,
    'status', 'verified'
  );
END;
$$;

-- Rewrite already-delivered claim notifications to the new copy.
UPDATE public.notifications n
SET body = CASE n.data->>'claimStatus'
  WHEN 'approved' THEN
    COALESCE(NULLIF(trim(l.name), ''), 'This location')
      || ' is now verified by Tini Time Club.'
  WHEN 'superseded' THEN
    COALESCE(NULLIF(trim(l.name), ''), 'This location')
      || ' was already verified, so your claim was closed.'
  WHEN 'rejected' THEN
    'Your claim for ' || COALESCE(NULLIF(trim(l.name), ''), 'this location')
      || ' needs attention. Open Tini Time Club to review the decision.'
  ELSE n.body
END
FROM public.locations l
WHERE n.event_key LIKE 'location-claim:%'
  AND l.id = (n.data->>'locationId')::bigint;

COMMIT;
