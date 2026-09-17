BEGIN;

-- Owners can now claim their place from the public website without a member
-- account. Claims record their origin, web claims must carry a contact, and
-- pending web claims dedupe per location + business email. The operator
-- reviews web claims in the same /admin/claims queue as member claims.

ALTER TABLE public.location_claims
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'app'
    CHECK (source IN ('app', 'web'));

ALTER TABLE public.location_claims
  ADD CONSTRAINT location_claims_web_contact_check CHECK (
    source <> 'web' OR (contact_name IS NOT NULL AND business_email IS NOT NULL)
  );

-- Anonymous web claims have no requester to dedupe on; a pending web claim is
-- unique per location + business email instead.
CREATE UNIQUE INDEX IF NOT EXISTS location_claims_pending_web_unique_idx
  ON public.location_claims (location_id, lower(business_email))
  WHERE status = 'pending' AND source = 'web';

CREATE OR REPLACE FUNCTION public.submit_web_location_claim(
  p_location_id bigint,
  p_contact_name text,
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
  v_claim_id uuid;
BEGIN
  IF p_location_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.locations l WHERE l.id = p_location_id
  ) THEN
    RAISE EXCEPTION 'Location not found' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(COALESCE(p_contact_name, '')), '') IS NULL
     OR length(trim(p_contact_name)) > 120 THEN
    RAISE EXCEPTION 'Enter your name' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(COALESCE(p_business_role, '')), '') IS NULL
     OR length(trim(p_business_role)) > 80 THEN
    RAISE EXCEPTION 'Enter your role at the business' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(COALESCE(p_business_email, '')), '') IS NULL
     OR length(trim(p_business_email)) > 320
     OR position('@' IN trim(p_business_email)) <= 1 THEN
    RAISE EXCEPTION 'Enter a valid business email' USING ERRCODE = '22023';
  END IF;
  IF p_phone IS NOT NULL AND length(trim(p_phone)) > 40 THEN
    RAISE EXCEPTION 'Phone number is too long' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(COALESCE(p_explanation, '')), '') IS NULL
     OR length(trim(p_explanation)) > 1000 THEN
    RAISE EXCEPTION 'Enter a short explanation' USING ERRCODE = '22023';
  END IF;

  BEGIN
    INSERT INTO public.location_claims (
      location_id, requester_profile_id, contact_name, business_role,
      business_email, phone, explanation, source
    ) VALUES (
      p_location_id,
      NULL,
      trim(p_contact_name),
      trim(p_business_role),
      lower(trim(p_business_email)),
      NULLIF(trim(COALESCE(p_phone, '')), ''),
      trim(p_explanation),
      'web'
    )
    RETURNING id INTO v_claim_id;
  EXCEPTION WHEN unique_violation THEN
    -- The same email already has this location under review; treat the
    -- resubmit as success so the form never leaks review state.
    RETURN jsonb_build_object('duplicate', true);
  END;

  RETURN jsonb_build_object('claimId', v_claim_id, 'status', 'pending');
END;
$$;

REVOKE ALL ON FUNCTION public.submit_web_location_claim(
  bigint, text, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_web_location_claim(
  bigint, text, text, text, text, text
) TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
