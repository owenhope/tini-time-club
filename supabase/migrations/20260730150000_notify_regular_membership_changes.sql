CREATE TABLE IF NOT EXISTS public.regular_memberships (
  location_id bigint NOT NULL
    REFERENCES public.locations(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL
    REFERENCES public.profiles(id) ON DELETE CASCADE,
  rank smallint NOT NULL CHECK (rank BETWEEN 1 AND 3),
  review_count integer NOT NULL CHECK (review_count > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (location_id, profile_id),
  UNIQUE (location_id, rank)
);

CREATE INDEX IF NOT EXISTS regular_memberships_profile_id_idx
  ON public.regular_memberships(profile_id);

ALTER TABLE public.regular_memberships ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.regular_memberships FROM anon, authenticated;
GRANT ALL ON TABLE public.regular_memberships TO service_role;

-- Seed the snapshot without notifying members about rankings that already exist.
INSERT INTO public.regular_memberships (
  location_id,
  profile_id,
  rank,
  review_count
)
WITH reviewer_counts AS (
  SELECT
    r.location AS location_id,
    r.user_id AS profile_id,
    count(*)::integer AS review_count,
    max(r.inserted_at) AS latest_review_at
  FROM public.reviews AS r
  JOIN public.profiles AS p
    ON p.id = r.user_id
   AND p.deleted = false
  WHERE r.state = 1
    AND r.location IS NOT NULL
  GROUP BY r.location, r.user_id
),
ranked AS (
  SELECT
    reviewer_counts.*,
    row_number() OVER (
      PARTITION BY location_id
      ORDER BY review_count DESC, latest_review_at DESC, profile_id
    )::smallint AS rank
  FROM reviewer_counts
)
SELECT location_id, profile_id, rank, review_count
FROM ranked
WHERE rank <= 3
ON CONFLICT (location_id, profile_id) DO UPDATE SET
  rank = EXCLUDED.rank,
  review_count = EXCLUDED.review_count,
  updated_at = now();

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

REVOKE ALL ON FUNCTION public.refresh_regular_memberships(bigint) FROM PUBLIC;

CREATE OR REPLACE FUNCTION public.refresh_regulars_after_review_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.refresh_regular_memberships(OLD.location);
  ELSIF TG_OP = 'UPDATE' AND OLD.location IS DISTINCT FROM NEW.location THEN
    PERFORM public.refresh_regular_memberships(OLD.location);
    PERFORM public.refresh_regular_memberships(NEW.location);
  ELSE
    PERFORM public.refresh_regular_memberships(NEW.location);
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_regulars_after_review_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS refresh_regulars_after_review_change
  ON public.reviews;
CREATE TRIGGER refresh_regulars_after_review_change
AFTER INSERT OR DELETE OR UPDATE OF location, user_id, state, inserted_at
ON public.reviews
FOR EACH ROW
EXECUTE FUNCTION public.refresh_regulars_after_review_change();

CREATE OR REPLACE FUNCTION public.refresh_regulars_after_profile_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_location_id bigint;
BEGIN
  IF OLD.deleted IS NOT DISTINCT FROM NEW.deleted THEN
    RETURN NEW;
  END IF;

  FOR v_location_id IN
    SELECT DISTINCT r.location
    FROM public.reviews AS r
    WHERE r.user_id = NEW.id
      AND r.location IS NOT NULL
  LOOP
    PERFORM public.refresh_regular_memberships(v_location_id);
  END LOOP;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_regulars_after_profile_change() FROM PUBLIC;

DROP TRIGGER IF EXISTS refresh_regulars_after_profile_change
  ON public.profiles;
CREATE TRIGGER refresh_regulars_after_profile_change
AFTER UPDATE OF deleted ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.refresh_regulars_after_profile_change();

CREATE OR REPLACE FUNCTION public.get_regulars_for_locations(
  p_location_ids bigint[],
  p_limit integer DEFAULT 3
)
RETURNS TABLE(
  location_id bigint,
  rank integer,
  profile_id uuid,
  username text,
  avatar_url text,
  is_verified boolean,
  review_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    membership.location_id,
    membership.rank::integer,
    p.id AS profile_id,
    p.username,
    p.avatar_url,
    COALESCE(p.is_verified, false) AS is_verified,
    membership.review_count
  FROM public.regular_memberships AS membership
  JOIN public.profiles AS p
    ON p.id = membership.profile_id
   AND p.deleted = false
  WHERE membership.location_id = ANY(p_location_ids)
    AND membership.rank <= greatest(1, least(COALESCE(p_limit, 3), 3))
  ORDER BY membership.location_id, membership.rank;
$$;

CREATE OR REPLACE FUNCTION public.get_profile_regular_places(
  p_profile_id uuid
)
RETURNS TABLE(
  location_id bigint,
  location_name text,
  location_address text,
  rank integer,
  review_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.id AS location_id,
    l.name AS location_name,
    l.address AS location_address,
    membership.rank::integer,
    membership.review_count
  FROM public.regular_memberships AS membership
  JOIN public.locations AS l ON l.id = membership.location_id
  WHERE membership.profile_id = p_profile_id
  ORDER BY membership.rank, membership.review_count DESC, l.name;
$$;

REVOKE ALL ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_profile_regular_places(uuid)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_regulars_for_locations(bigint[], integer)
  TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_profile_regular_places(uuid)
  TO anon, authenticated;
