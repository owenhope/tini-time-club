-- Merge legacy location rows created before Google place IDs became the
-- canonical identity. Every pair below has the same normalized name and
-- coordinates; the surviving row is the one carrying the Google place ID.

BEGIN;

CREATE TEMP TABLE location_merge_pairs (
  duplicate_id bigint PRIMARY KEY,
  canonical_id bigint NOT NULL UNIQUE
) ON COMMIT DROP;

INSERT INTO location_merge_pairs (duplicate_id, canonical_id)
VALUES
  (75, 17), -- Dovetail
  (80, 40), -- Cactus Club Cafe, West Vancouver
  (84, 37), -- Tableau Bar Bistro
  (88, 87); -- Fairmont Pacific Rim

DO $$
DECLARE
  existing_duplicate_count integer;
  valid_pair_count integer;
BEGIN
  SELECT count(*)::integer
  INTO existing_duplicate_count
  FROM location_merge_pairs AS pair
  JOIN public.locations AS duplicate ON duplicate.id = pair.duplicate_id;

  -- The production repair was applied directly before this migration entered
  -- normal deployment history. Once all source rows are gone, future applies
  -- must be a no-op rather than failing the validation below.
  IF existing_duplicate_count = 0 THEN
    DELETE FROM location_merge_pairs;
    RETURN;
  END IF;

  SELECT count(*)::integer
  INTO valid_pair_count
  FROM location_merge_pairs AS pair
  JOIN public.locations AS duplicate ON duplicate.id = pair.duplicate_id
  JOIN public.locations AS canonical ON canonical.id = pair.canonical_id
  WHERE duplicate.place_id IS NULL
    AND canonical.place_id IS NOT NULL
    AND regexp_replace(lower(trim(duplicate.name)), '[^a-z0-9]+', '', 'g') =
        regexp_replace(lower(trim(canonical.name)), '[^a-z0-9]+', '', 'g')
    AND gis.st_dwithin(duplicate.location, canonical.location, 1);

  IF existing_duplicate_count <> 4 OR valid_pair_count <> 4 THEN
    RAISE EXCEPTION
      'Location merge guard failed: expected 4 existing/validated pairs, found %/%',
      existing_duplicate_count,
      valid_pair_count;
  END IF;
END;
$$;

-- The newer legacy rows have better numbered street addresses for three of
-- the venues. Keep that detail while retaining the canonical IDs/place IDs.
UPDATE public.locations AS canonical
SET address = duplicate.address
FROM location_merge_pairs AS pair
JOIN public.locations AS duplicate ON duplicate.id = pair.duplicate_id
WHERE canonical.id = pair.canonical_id
  AND duplicate.address ~ '^[0-9]'
  AND canonical.address !~ '^[0-9]';

-- Moving a review normally recalculates Regulars and emits membership-change
-- notifications. This maintenance transaction rebuilds the snapshot itself,
-- so suppress only that trigger to avoid false user notifications.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.reviews'::regclass
      AND tgname = 'refresh_regulars_after_review_change'
      AND NOT tgisinternal
  ) THEN
    ALTER TABLE public.reviews
      DISABLE TRIGGER refresh_regulars_after_review_change;
  END IF;
END;
$$;

UPDATE public.reviews AS review
SET location = pair.canonical_id
FROM location_merge_pairs AS pair
WHERE review.location = pair.duplicate_id;

UPDATE public.profiles AS profile
SET favorite_location_id = pair.canonical_id
FROM location_merge_pairs AS pair
WHERE profile.favorite_location_id = pair.duplicate_id;

DO $$
BEGIN
  IF to_regclass('public.celebration_events') IS NOT NULL THEN
    EXECUTE $sql$
      UPDATE public.celebration_events AS event
      SET location_id = pair.canonical_id
      FROM location_merge_pairs AS pair
      WHERE event.location_id = pair.duplicate_id
    $sql$;
  END IF;
END;
$$;

-- Notification payloads are denormalized JSON and do not participate in the
-- location foreign key, but old links should still open the surviving venue.
UPDATE public.notifications AS notification
SET data = jsonb_set(
  notification.data,
  '{locationId}',
  to_jsonb(pair.canonical_id),
  false
)
FROM location_merge_pairs AS pair
WHERE notification.data ->> 'locationId' = pair.duplicate_id::text;

UPDATE public.notifications AS notification
SET data = jsonb_set(
  notification.data,
  '{url}',
  to_jsonb('/places/' || pair.canonical_id::text),
  false
)
FROM location_merge_pairs AS pair
WHERE notification.data ->> 'url' = '/places/' || pair.duplicate_id::text;

DO $$
BEGIN
  IF to_regclass('public.regular_memberships') IS NOT NULL THEN
    EXECUTE $sql$
      DELETE FROM public.regular_memberships AS membership
      USING location_merge_pairs AS pair
      WHERE membership.location_id IN (pair.duplicate_id, pair.canonical_id)
    $sql$;

    EXECUTE $sql$
      INSERT INTO public.regular_memberships (
        location_id,
        profile_id,
        rank,
        review_count
      )
      WITH reviewer_counts AS (
        SELECT
          review.location AS location_id,
          review.user_id AS profile_id,
          count(*)::integer AS review_count,
          max(review.inserted_at) AS latest_review_at
        FROM public.reviews AS review
        JOIN public.profiles AS profile
          ON profile.id = review.user_id
         AND profile.deleted = false
        WHERE review.state = 1
          AND review.location IN (
            SELECT canonical_id FROM location_merge_pairs
          )
        GROUP BY review.location, review.user_id
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
    $sql$;
  END IF;
END;
$$;

DELETE FROM public.locations AS location
USING location_merge_pairs AS pair
WHERE location.id = pair.duplicate_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_trigger
    WHERE tgrelid = 'public.reviews'::regclass
      AND tgname = 'refresh_regulars_after_review_change'
      AND NOT tgisinternal
  ) THEN
    ALTER TABLE public.reviews
      ENABLE TRIGGER refresh_regulars_after_review_change;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.locations AS location
    JOIN location_merge_pairs AS pair ON pair.duplicate_id = location.id
  ) THEN
    RAISE EXCEPTION 'Duplicate locations remain after merge';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.reviews AS review
    JOIN location_merge_pairs AS pair ON pair.duplicate_id = review.location
  ) THEN
    RAISE EXCEPTION 'Reviews still reference duplicate locations after merge';
  END IF;
END;
$$;

COMMIT;
