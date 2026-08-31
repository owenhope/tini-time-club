-- Allow operators to verify a place when there is no member-submitted claim.
-- The synthetic claim keeps location_verifications.source_claim_id meaningful
-- and gives the decision an auditable, private admin reason.

BEGIN;

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
      'This location was already verified. Your claim did not grant management access.',
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

REVOKE ALL ON FUNCTION public.admin_verify_location(bigint, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_verify_location(bigint, text)
  TO service_role;

COMMIT;
