BEGIN;

-- Passport analytics for the admin dashboard: stamp velocity, points in
-- circulation, the catalog's most-earned stamps, and the members leading the
-- ranks. Same admin rollup conventions as 20260822233000 (service-role only,
-- bounded range, previous period derived from the selected one).
CREATE OR REPLACE FUNCTION public.get_admin_passport_analytics(
  p_since date,
  p_until date
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
  v_days integer := (p_until - p_since) + 1;
  v_prior_since date := p_since - ((p_until - p_since) + 1);
  v_prior_until date := p_since - 1;
  v_result jsonb;
BEGIN
  IF p_since IS NULL OR p_until IS NULL OR p_since > p_until OR v_days > 366 THEN
    RAISE EXCEPTION 'Analytics range must contain between 1 and 366 days';
  END IF;

  WITH active_members AS (
    SELECT p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio, p.passport_points
    FROM public.profiles p
    WHERE p.deleted = false
  ),
  awards AS (
    SELECT a.id, a.profile_id, a.definition_id, a.awarded_at,
      d.key, d.series, d.metric, d.threshold, d.points, d.title, d.unit,
      d.subject_a, d.subject_b
    FROM public.passport_awards a
    JOIN public.passport_definitions d ON d.id = a.definition_id
    JOIN active_members member ON member.id = a.profile_id
    WHERE a.revoked_at IS NULL
  ),
  awards_current AS (
    SELECT * FROM awards
    WHERE awarded_at >= p_since::timestamptz
      AND awarded_at < (p_until + 1)::timestamptz
  ),
  awards_previous AS (
    SELECT * FROM awards
    WHERE awarded_at >= v_prior_since::timestamptz
      AND awarded_at < (v_prior_until + 1)::timestamptz
  ),
  labelled AS (
    SELECT awards.*,
      CASE WHEN awards.metric = 'combination'
        THEN concat_ws(' · ', s.name, t.name)
        ELSE awards.threshold::text || ' ' ||
          CASE WHEN awards.threshold = 1
            THEN regexp_replace(awards.unit, 's$', '')
            ELSE awards.unit END
      END AS label
    FROM awards
    LEFT JOIN public.spirits s
      ON awards.metric = 'combination' AND s.id = awards.subject_a
    LEFT JOIN public.types t
      ON awards.metric = 'combination' AND t.id = awards.subject_b
  ),
  top_stamps AS (
    SELECT key, series, title, label, points,
      count(*) AS award_count,
      max(awarded_at) AS last_awarded_at
    FROM labelled
    WHERE awarded_at >= p_since::timestamptz
      AND awarded_at < (p_until + 1)::timestamptz
    GROUP BY key, series, title, label, points
    ORDER BY award_count DESC, last_awarded_at DESC, key
    LIMIT 10
  ),
  top_members AS (
    SELECT member.*,
      COALESCE(stats.stamp_count, 0) AS stamp_count,
      stats.last_award_at
    FROM active_members member
    LEFT JOIN (
      SELECT profile_id, count(*) AS stamp_count, max(awarded_at) AS last_award_at
      FROM awards GROUP BY profile_id
    ) stats ON stats.profile_id = member.id
    WHERE member.passport_points > 0
    ORDER BY member.passport_points DESC, stats.last_award_at DESC NULLS LAST,
      member.id
    LIMIT 10
  ),
  recent_awards AS (
    SELECT labelled.*, member.username, member.name AS member_name,
      member.avatar_url, member.is_verified, member.deleted,
      member.deleted_at, member.review_count, member.bio
    FROM labelled
    JOIN active_members member ON member.id = labelled.profile_id
    WHERE labelled.awarded_at >= p_since::timestamptz
      AND labelled.awarded_at < (p_until + 1)::timestamptz
    ORDER BY labelled.awarded_at DESC, labelled.id DESC
    LIMIT 20
  )
  SELECT jsonb_build_object(
    'totals', jsonb_build_object(
      'stampsAwarded', (SELECT count(*) FROM awards),
      'membersWithStamps', (SELECT count(DISTINCT profile_id) FROM awards),
      'pointsInCirculation',
        (SELECT COALESCE(sum(passport_points), 0) FROM active_members)
    ),
    'current', jsonb_build_object(
      'stamps', (SELECT count(*) FROM awards_current),
      'points', (SELECT COALESCE(sum(points), 0) FROM awards_current),
      'earningMembers',
        (SELECT count(DISTINCT profile_id) FROM awards_current)
    ),
    'previous', jsonb_build_object(
      'stamps', (SELECT count(*) FROM awards_previous),
      'points', (SELECT COALESCE(sum(points), 0) FROM awards_previous),
      'earningMembers',
        (SELECT count(DISTINCT profile_id) FROM awards_previous)
    ),
    'stampsByDay', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('day', day, 'count', count)
        ORDER BY day)
      FROM (
        SELECT awarded_at::date AS day, count(*) AS count
        FROM awards_current GROUP BY awarded_at::date
      ) days
    ), '[]'::jsonb),
    'pointsDistribution', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'points', passport_points, 'count', count) ORDER BY passport_points)
      FROM (
        SELECT passport_points, count(*) AS count
        FROM active_members
        GROUP BY passport_points
      ) buckets
    ), '[]'::jsonb),
    'topStamps', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'key', key, 'series', series, 'title', title, 'label', label,
        'points', points, 'awardCount', award_count,
        'lastAwardedAt', last_awarded_at
      ) ORDER BY award_count DESC, last_awarded_at DESC, key)
      FROM top_stamps
    ), '[]'::jsonb),
    'topMembers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id, 'username', username, 'name', name,
        'avatar_url', avatar_url, 'is_verified', is_verified,
        'deleted', deleted, 'deleted_at', deleted_at,
        'review_count', review_count, 'bio', bio,
        'passport_points', passport_points,
        'stamp_count', stamp_count, 'last_award_at', last_award_at
      ) ORDER BY passport_points DESC, last_award_at DESC NULLS LAST, id)
      FROM top_members
    ), '[]'::jsonb),
    'recentAwards', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'awardedAt', awarded_at,
        'title', title,
        'label', label,
        'series', series,
        'points', points,
        'profile', jsonb_build_object(
          'id', profile_id,
          'username', username,
          'name', member_name,
          'avatar_url', avatar_url,
          'is_verified', is_verified,
          'deleted', deleted,
          'deleted_at', deleted_at,
          'review_count', review_count,
          'bio', bio
        )
      ) ORDER BY awarded_at DESC, id DESC)
      FROM recent_awards
    ), '[]'::jsonb)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_admin_passport_analytics(date, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_passport_analytics(date, date)
  TO service_role;

NOTIFY pgrst, 'reload schema';
COMMIT;
