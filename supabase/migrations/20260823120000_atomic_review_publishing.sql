-- Publish a review and all of its relational side effects through one
-- versioned transaction. Storage upload remains client-side and is cleaned up
-- by the client if this function fails.

BEGIN;

CREATE FUNCTION public.publish_review_v1(
  p_image_url text,
  p_location_id bigint DEFAULT NULL,
  p_location_name text DEFAULT NULL,
  p_location_address text DEFAULT NULL,
  p_place_id text DEFAULT NULL,
  p_latitude double precision DEFAULT NULL,
  p_longitude double precision DEFAULT NULL,
  p_spirit_id bigint DEFAULT NULL,
  p_type_id bigint DEFAULT NULL,
  p_taste numeric DEFAULT NULL,
  p_presentation numeric DEFAULT NULL,
  p_comment text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, gis, pg_temp
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_became_regular boolean;
  v_location_id bigint;
  v_location_name text;
  v_new_review_count integer;
  v_previous_review_count integer;
  v_rank_up text;
  v_review_id bigint;
  v_was_regular boolean;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = v_actor_id
      AND p.deleted = false
  ) THEN
    RAISE EXCEPTION 'The publishing profile is unavailable'
      USING ERRCODE = '42501';
  END IF;

  IF NULLIF(trim(p_image_url), '') IS NULL THEN
    RAISE EXCEPTION 'A review image is required' USING ERRCODE = '22023';
  END IF;

  IF p_taste IS NULL
     OR p_taste < 0.5
     OR p_taste > 5
     OR mod(p_taste * 2, 1) <> 0
     OR p_presentation IS NULL
     OR p_presentation < 0.5
     OR p_presentation > 5
     OR mod(p_presentation * 2, 1) <> 0 THEN
    RAISE EXCEPTION 'Ratings must use half-point steps between 0.5 and 5'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize a member's publishes so a rank threshold can only be reported
  -- once even if two submissions finish at nearly the same time.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('publish-profile:' || v_actor_id::text, 0)
  );

  SELECT p.review_count
  INTO v_previous_review_count
  FROM public.profiles p
  WHERE p.id = v_actor_id
  FOR UPDATE;

  -- Resolve an existing location or create it inside this transaction. The
  -- location lock closes the old lookup-then-insert race for submissions that
  -- do not carry a Google place id as well.
  PERFORM pg_advisory_xact_lock(
    hashtextextended(
      'publish-location:' || COALESCE(
        p_location_id::text,
        NULLIF(trim(p_place_id), ''),
        lower(COALESCE(trim(p_location_name), '')) || '|' ||
          lower(COALESCE(trim(p_location_address), ''))
      ),
      0
    )
  );

  IF p_location_id IS NOT NULL THEN
    SELECT l.id, l.name
    INTO v_location_id, v_location_name
    FROM public.locations l
    WHERE l.id = p_location_id;

    IF v_location_id IS NULL THEN
      RAISE EXCEPTION 'The selected location does not exist'
        USING ERRCODE = '23503';
    END IF;
  ELSE
    IF NULLIF(trim(p_location_name), '') IS NULL
       OR p_latitude IS NULL
       OR p_longitude IS NULL
       OR p_latitude NOT BETWEEN -90 AND 90
       OR p_longitude NOT BETWEEN -180 AND 180 THEN
      RAISE EXCEPTION 'A valid location name and coordinates are required'
        USING ERRCODE = '22023';
    END IF;

    IF NULLIF(trim(p_place_id), '') IS NOT NULL THEN
      SELECT l.id, l.name
      INTO v_location_id, v_location_name
      FROM public.locations l
      WHERE l.place_id = trim(p_place_id);
    END IF;

    IF v_location_id IS NULL THEN
      SELECT l.id, l.name
      INTO v_location_id, v_location_name
      FROM public.locations l
      WHERE lower(trim(l.name)) = lower(trim(p_location_name))
        AND lower(trim(COALESCE(l.address, ''))) =
            lower(trim(COALESCE(p_location_address, '')))
      ORDER BY l.id
      LIMIT 1;
    END IF;

    IF v_location_id IS NULL THEN
      INSERT INTO public.locations (
        name,
        address,
        place_id,
        location,
        created_by
      )
      VALUES (
        trim(p_location_name),
        NULLIF(trim(p_location_address), ''),
        NULLIF(trim(p_place_id), ''),
        gis.st_setsrid(
          gis.st_makepoint(p_longitude, p_latitude),
          4326
        )::gis.geography,
        v_actor_id
      )
      RETURNING id, name INTO v_location_id, v_location_name;
    ELSIF NULLIF(trim(p_place_id), '') IS NOT NULL THEN
      UPDATE public.locations l
      SET place_id = trim(p_place_id)
      WHERE l.id = v_location_id
        AND l.place_id IS NULL;
    END IF;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.regular_memberships membership
    WHERE membership.location_id = v_location_id
      AND membership.profile_id = v_actor_id
  )
  INTO v_was_regular;

  INSERT INTO public.reviews (
    user_id,
    image_url,
    comment,
    type,
    spirit,
    location,
    taste,
    presentation,
    state
  )
  VALUES (
    v_actor_id,
    trim(p_image_url),
    COALESCE(trim(p_comment), ''),
    p_type_id,
    p_spirit_id,
    v_location_id,
    p_taste,
    p_presentation,
    1
  )
  RETURNING id INTO v_review_id;

  SELECT p.review_count
  INTO v_new_review_count
  FROM public.profiles p
  WHERE p.id = v_actor_id;

  SELECT NOT v_was_regular AND EXISTS (
    SELECT 1
    FROM public.regular_memberships membership
    WHERE membership.location_id = v_location_id
      AND membership.profile_id = v_actor_id
  )
  INTO v_became_regular;

  v_rank_up := CASE
    WHEN v_previous_review_count < 150 AND v_new_review_count >= 150
      THEN 'topShelf'
    WHEN v_previous_review_count < 50 AND v_new_review_count >= 50
      THEN 'premium'
    WHEN v_previous_review_count < 10 AND v_new_review_count >= 10
      THEN 'call'
    ELSE NULL
  END;

  RETURN jsonb_build_object(
    'reviewId', v_review_id,
    'locationId', v_location_id,
    'locationName', COALESCE(v_location_name, trim(p_location_name)),
    'reviewCount', v_new_review_count,
    'rankUp', v_rank_up,
    'becameRegular', v_became_regular
  );
END;
$$;

REVOKE ALL ON FUNCTION public.publish_review_v1(
  text,
  bigint,
  text,
  text,
  text,
  double precision,
  double precision,
  bigint,
  bigint,
  numeric,
  numeric,
  text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.publish_review_v1(
  text,
  bigint,
  text,
  text,
  text,
  double precision,
  double precision,
  bigint,
  bigint,
  numeric,
  numeric,
  text
) TO authenticated, service_role;

COMMIT;
