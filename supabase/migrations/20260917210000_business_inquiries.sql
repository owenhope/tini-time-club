BEGIN;

-- General business inquiries filed from the public website (the homepage
-- "Places & status" CTA). Unlike location claims these carry no location
-- reference; the operator triages them in /admin/inquiries.

CREATE TABLE IF NOT EXISTS public.business_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name text NOT NULL,
  business_name text NOT NULL,
  business_email text NOT NULL,
  phone text,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'new'
    CHECK (status IN ('new', 'handled')),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  handled_at timestamptz,
  CONSTRAINT business_inquiries_contact_name_check CHECK (
    length(trim(contact_name)) BETWEEN 1 AND 120
  ),
  CONSTRAINT business_inquiries_business_name_check CHECK (
    length(trim(business_name)) BETWEEN 1 AND 160
  ),
  CONSTRAINT business_inquiries_email_check CHECK (
    length(trim(business_email)) BETWEEN 3 AND 320
    AND position('@' IN trim(business_email)) > 1
  ),
  CONSTRAINT business_inquiries_phone_check CHECK (
    phone IS NULL OR length(trim(phone)) BETWEEN 1 AND 40
  ),
  CONSTRAINT business_inquiries_message_check CHECK (
    length(trim(message)) BETWEEN 1 AND 1000
  ),
  CONSTRAINT business_inquiries_handled_check CHECK (
    (status = 'new' AND handled_at IS NULL)
    OR (status = 'handled' AND handled_at IS NOT NULL)
  )
);

ALTER TABLE public.business_inquiries ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS business_inquiries_queue_idx
  ON public.business_inquiries (status, submitted_at DESC, id DESC);

CREATE OR REPLACE FUNCTION public.submit_business_inquiry(
  p_contact_name text,
  p_business_name text,
  p_business_email text,
  p_phone text DEFAULT NULL,
  p_message text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NULLIF(trim(COALESCE(p_contact_name, '')), '') IS NULL
     OR length(trim(p_contact_name)) > 120 THEN
    RAISE EXCEPTION 'Enter your name' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(COALESCE(p_business_name, '')), '') IS NULL
     OR length(trim(p_business_name)) > 160 THEN
    RAISE EXCEPTION 'Enter the business name' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(COALESCE(p_business_email, '')), '') IS NULL
     OR length(trim(p_business_email)) > 320
     OR position('@' IN trim(p_business_email)) <= 1 THEN
    RAISE EXCEPTION 'Enter a valid business email' USING ERRCODE = '22023';
  END IF;
  IF p_phone IS NOT NULL AND length(trim(p_phone)) > 40 THEN
    RAISE EXCEPTION 'Phone number is too long' USING ERRCODE = '22023';
  END IF;
  IF NULLIF(trim(COALESCE(p_message, '')), '') IS NULL
     OR length(trim(p_message)) > 1000 THEN
    RAISE EXCEPTION 'Enter a short message' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.business_inquiries (
    contact_name, business_name, business_email, phone, message
  ) VALUES (
    trim(p_contact_name),
    trim(p_business_name),
    lower(trim(p_business_email)),
    NULLIF(trim(COALESCE(p_phone, '')), ''),
    trim(p_message)
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('inquiryId', v_id, 'status', 'new');
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_business_inquiry_handled(
  p_inquiry_id uuid,
  p_handled boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.business_inquiries
  SET status = CASE WHEN p_handled THEN 'handled' ELSE 'new' END,
      handled_at = CASE WHEN p_handled THEN now() ELSE NULL END
  WHERE id = p_inquiry_id
  RETURNING jsonb_build_object('inquiryId', id, 'status', status);
$$;

REVOKE ALL ON FUNCTION public.submit_business_inquiry(text, text, text, text, text),
  public.mark_business_inquiry_handled(uuid, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_business_inquiry(text, text, text, text, text),
  public.mark_business_inquiry_handled(uuid, boolean)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
