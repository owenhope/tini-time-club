-- Regular status now requires at least two published reviews at a location.
-- Previously the first one to three reviewers of any bar became its Regulars
-- after a single review.

BEGIN;

CREATE OR REPLACE FUNCTION public.refresh_regular_memberships(
  p_location_id bigint
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current jsonb;
  v_location_name text;
  v_previous jsonb;
  v_transition_id text := txid_current()::text;
BEGIN
  IF p_location_id IS NULL THEN
    RETURN;
  END IF;

  -- Review writes for one location can arrive concurrently. Serializing refreshes
  -- ensures each transaction compares against the latest committed membership.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('regulars:' || p_location_id::text, 0)
  );

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'profile_id', membership.profile_id,
        'rank', membership.rank,
        'review_count', membership.review_count
      )
      ORDER BY membership.rank
    ),
    '[]'::jsonb
  )
  INTO v_previous
  FROM public.regular_memberships AS membership
  WHERE membership.location_id = p_location_id;

  WITH reviewer_counts AS (
    SELECT
      r.user_id AS profile_id,
      count(*)::integer AS review_count,
      max(r.inserted_at) AS latest_review_at
    FROM public.reviews AS r
    JOIN public.profiles AS p
      ON p.id = r.user_id
     AND p.deleted = false
    WHERE r.location = p_location_id
      AND r.state = 1
    GROUP BY r.user_id
    -- A single visit doesn't make a Regular: members need repeat reviews.
    HAVING count(*) >= 2
  ),
  ranked AS (
    SELECT
      reviewer_counts.*,
      row_number() OVER (
        ORDER BY review_count DESC, latest_review_at DESC, profile_id
      )::smallint AS rank
    FROM reviewer_counts
  )
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'profile_id', ranked.profile_id,
        'rank', ranked.rank,
        'review_count', ranked.review_count
      )
      ORDER BY ranked.rank
    ) FILTER (WHERE ranked.rank <= 3),
    '[]'::jsonb
  )
  INTO v_current
  FROM ranked;

  DELETE FROM public.regular_memberships
  WHERE location_id = p_location_id;

  INSERT INTO public.regular_memberships (
    location_id,
    profile_id,
    rank,
    review_count
  )
  SELECT
    p_location_id,
    current_membership.profile_id,
    current_membership.rank,
    current_membership.review_count
  FROM jsonb_to_recordset(v_current) AS current_membership(
    profile_id uuid,
    rank smallint,
    review_count integer
  );

  SELECT name
  INTO v_location_name
  FROM public.locations
  WHERE id = p_location_id;

  INSERT INTO public.notifications (
    user_id,
    body,
    type,
    kind,
    data,
    event_key
  )
  SELECT
    current_membership.profile_id,
    concat(
      'You''re now a Regular at ',
      COALESCE(v_location_name, 'this location')
    ),
    2,
    'regular_joined',
    jsonb_build_object(
      'kind', 'regular_joined',
      'locationId', p_location_id,
      'rank', current_membership.rank,
      'url', concat('/places/', p_location_id)
    ),
    concat(
      'regular:joined:',
      p_location_id,
      ':',
      current_membership.profile_id,
      ':',
      v_transition_id
    )
  FROM jsonb_to_recordset(v_current) AS current_membership(
    profile_id uuid,
    rank smallint,
    review_count integer
  )
  WHERE NOT EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_previous) AS previous_membership(
      profile_id uuid,
      rank smallint,
      review_count integer
    )
    WHERE previous_membership.profile_id = current_membership.profile_id
  )
  ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;

  INSERT INTO public.notifications (
    user_id,
    body,
    type,
    kind,
    data,
    event_key
  )
  SELECT
    previous_membership.profile_id,
    concat(
      'You''re no longer a Regular at ',
      COALESCE(v_location_name, 'this location')
    ),
    2,
    'regular_left',
    jsonb_build_object(
      'kind', 'regular_left',
      'locationId', p_location_id,
      'url', concat('/places/', p_location_id)
    ),
    concat(
      'regular:left:',
      p_location_id,
      ':',
      previous_membership.profile_id,
      ':',
      v_transition_id
    )
  FROM jsonb_to_recordset(v_previous) AS previous_membership(
    profile_id uuid,
    rank smallint,
    review_count integer
  )
  JOIN public.profiles AS p
    ON p.id = previous_membership.profile_id
   AND p.deleted = false
  WHERE NOT EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(v_current) AS current_membership(
      profile_id uuid,
      rank smallint,
      review_count integer
    )
    WHERE current_membership.profile_id = previous_membership.profile_id
  )
  ON CONFLICT (event_key) WHERE event_key IS NOT NULL DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_regular_memberships(bigint)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_regular_memberships(bigint)
TO service_role;

-- Ranking is by review count, so single-review members always sit below any
-- repeat reviewer. Removing them leaves the remaining ranks contiguous and
-- matches what a fresh refresh would compute. Done directly rather than via
-- refresh_regular_memberships so existing members aren't sent a burst of
-- "no longer a Regular" notifications for a rule change. Passport stamps
-- already earned are permanent and stay.
DELETE FROM public.regular_memberships
WHERE review_count < 2;

ALTER TABLE public.regular_memberships
  DROP CONSTRAINT IF EXISTS regular_memberships_review_count_check;
ALTER TABLE public.regular_memberships
  ADD CONSTRAINT regular_memberships_review_count_check
  CHECK (review_count >= 2);

COMMIT;
