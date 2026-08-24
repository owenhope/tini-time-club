-- The development database enables safe-delete enforcement. Keep the
-- transactional whole-snapshot replacement while making the intent explicit.

CREATE OR REPLACE FUNCTION public.refresh_golden_glass_v1()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF COALESCE(auth.role(), '') NOT IN ('', 'service_role')
     AND current_user <> 'postgres' THEN
    RAISE EXCEPTION 'Golden Glass refresh is service-role only'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.golden_glass_snapshot WHERE true;

  INSERT INTO public.golden_glass_snapshot (
    region_id, location_id, rank, raw_overall, adjusted_score,
    distinct_reviewers, latest_review_at, refreshed_at
  )
  WITH member_contributions AS (
    SELECT l.region_id, l.id AS location_id, r.user_id,
      avg((r.taste + r.presentation) / 2.0)::numeric AS member_overall,
      max(r.inserted_at) AS latest_review_at
    FROM public.locations l
    JOIN public.regions region
      ON region.id = l.region_id AND region.enabled = true
    JOIN public.reviews r ON r.location = l.id AND r.state = 1
    JOIN public.profiles p ON p.id = r.user_id AND p.deleted = false
    WHERE l.golden_glass_eligible = true
    GROUP BY l.region_id, l.id, r.user_id
  ),
  region_stats AS (
    SELECT region_id, avg(member_overall) AS region_c
    FROM member_contributions
    GROUP BY region_id
  ),
  global_stats AS (
    SELECT avg(all_contributions.member_overall) AS global_c
    FROM (
      SELECT r.location, r.user_id,
        avg((r.taste + r.presentation) / 2.0)::numeric AS member_overall
      FROM public.reviews r
      JOIN public.locations l ON l.id = r.location
      JOIN public.profiles p ON p.id = r.user_id AND p.deleted = false
      WHERE r.state = 1
      GROUP BY r.location, r.user_id
    ) all_contributions
  ),
  candidates AS (
    SELECT contributions.region_id, contributions.location_id,
      avg(contributions.member_overall)::numeric AS raw_overall,
      count(*)::integer AS distinct_reviewers,
      max(contributions.latest_review_at) AS latest_review_at
    FROM member_contributions contributions
    GROUP BY contributions.region_id, contributions.location_id
    HAVING count(*) >= 3
  ),
  scored AS (
    SELECT candidates.*,
      (
        (candidates.distinct_reviewers::numeric /
          (candidates.distinct_reviewers + 3)) * candidates.raw_overall
        + (3::numeric /
          (candidates.distinct_reviewers + 3)) *
          coalesce(region_stats.region_c, global_stats.global_c, 3)
      ) AS adjusted_score
    FROM candidates
    LEFT JOIN region_stats ON region_stats.region_id = candidates.region_id
    CROSS JOIN global_stats
  ),
  ordered AS (
    SELECT scored.*,
      row_number() OVER (
        PARTITION BY scored.region_id
        ORDER BY scored.adjusted_score DESC,
          scored.distinct_reviewers DESC,
          scored.raw_overall DESC,
          scored.latest_review_at DESC,
          scored.location_id ASC
      ) AS calculated_rank
    FROM scored
  )
  SELECT ordered.region_id, ordered.location_id,
    ordered.calculated_rank::smallint,
    round(ordered.raw_overall, 1), ordered.adjusted_score,
    ordered.distinct_reviewers, ordered.latest_review_at, now()
  FROM ordered
  WHERE ordered.calculated_rank <= 5;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_golden_glass_v1() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_golden_glass_v1() TO service_role;
