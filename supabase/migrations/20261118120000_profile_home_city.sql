BEGIN;

-- Public, user-selected home city only. Never store device coordinates or addresses.
ALTER TABLE public.profiles ADD COLUMN home_city jsonb;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_home_city_shape CHECK (
 home_city IS NULL OR (
  jsonb_typeof(home_city) = 'object'
  AND home_city ?& ARRAY['name','region','country','place_id','source']
  AND jsonb_typeof(home_city->'name') = 'string'
  AND length(btrim(home_city->>'name')) BETWEEN 1 AND 200
  AND jsonb_typeof(home_city->'region') = 'string'
  AND length(home_city->>'region') <= 200
  AND jsonb_typeof(home_city->'country') = 'string'
  AND length(btrim(home_city->>'country')) BETWEEN 1 AND 200
  AND (home_city->'place_id' = 'null'::jsonb OR jsonb_typeof(home_city->'place_id') = 'string')
  AND jsonb_typeof(home_city->'source') = 'string'
  AND home_city->>'source' IN ('manual','device')
  AND home_city - ARRAY['name','region','country','place_id','source'] = '{}'::jsonb
 ));

ALTER TABLE public.passport_definitions DROP CONSTRAINT passport_definitions_metric_check;
ALTER TABLE public.passport_definitions ADD CONSTRAINT passport_definitions_metric_check
 CHECK (metric IN ('locations','martinis','combination','type_reviews','spirit_reviews','regulars','comments','likes_received','shares','profile_photo','favorite_location','taste_profile','bio','favorites','home_city'));
INSERT INTO public.passport_definitions
 (key,series,metric,threshold,points,title,unit,hint,artwork_key,display_order)
 VALUES ('first-home-city','Profile','home_city',1,10,'Home City','home city','Add your home city to your profile.','location-outline',5)
 ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.passport_progress_v1(p_profile_id uuid)
RETURNS TABLE (definition_id uuid, progress integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT d.id,
    CASE d.metric
      WHEN 'locations' THEN (SELECT count(DISTINCT r.location)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.location IS NOT NULL)
      WHEN 'martinis' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1)
      WHEN 'combination' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.spirit=d.subject_a AND r.type=d.subject_b)
      WHEN 'type_reviews' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.type=d.subject_a)
      WHEN 'spirit_reviews' THEN (SELECT count(*)::integer FROM public.reviews r WHERE r.user_id=p_profile_id AND r.state=1 AND r.spirit=d.subject_a)
      WHEN 'favorites' THEN (SELECT count(*)::integer FROM public.location_favorites f WHERE f.profile_id=p_profile_id)
      WHEN 'regulars' THEN (SELECT count(*)::integer FROM public.regular_memberships m WHERE m.profile_id=p_profile_id)
      WHEN 'comments' THEN (SELECT count(*)::integer FROM public.comments c WHERE c.user_id=p_profile_id)
      WHEN 'likes_received' THEN (SELECT count(*)::integer FROM public.likes l JOIN public.reviews r ON r.id=l.review_id WHERE r.user_id=p_profile_id AND r.state=1)
      WHEN 'shares' THEN (SELECT count(DISTINCT s.review_id)::integer FROM public.review_share_events s WHERE s.user_id=p_profile_id AND s.outcome IN ('opened', 'copied', 'shared', 'completed'))
      WHEN 'profile_photo' THEN (SELECT CASE WHEN p.avatar_url IS NOT NULL THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'favorite_location' THEN (SELECT CASE WHEN p.favorite_location_id IS NOT NULL THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'taste_profile' THEN (SELECT CASE WHEN jsonb_array_length(public.normalize_favorite_ids(p.favorite_spirits)) > 0 AND jsonb_array_length(public.normalize_favorite_ids(p.favorite_types)) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'home_city' THEN (SELECT CASE WHEN p.home_city IS NOT NULL THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
      WHEN 'bio' THEN (SELECT CASE WHEN length(trim(coalesce(p.bio, ''))) > 0 THEN 1 ELSE 0 END FROM public.profiles p WHERE p.id=p_profile_id)
    END
  FROM public.passport_definitions d WHERE d.enabled;
$$;
REVOKE ALL ON FUNCTION public.passport_progress_v1(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.passport_progress_v1(uuid) TO service_role;


-- A narrow owner-only write awards the permanent stamp transactionally.
CREATE FUNCTION public.set_my_home_city_v1(p_city jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication required' USING ERRCODE='42501'; END IF;
 -- Use the same lock order as Passport reconciliation.
 PERFORM pg_advisory_xact_lock(hashtextextended('passport:' || auth.uid()::text, 0));
 UPDATE public.profiles SET home_city = p_city WHERE id=auth.uid() AND NOT deleted;
 IF NOT FOUND THEN RAISE EXCEPTION 'Profile unavailable' USING ERRCODE='42501'; END IF;
 RETURN public.reconcile_passport_for_v1(auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.set_my_home_city_v1(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_my_home_city_v1(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_activity(p_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  WITH params AS (
    SELECT greatest(1, least(COALESCE(p_limit, 10), 50)) AS limit_value
  ),
  active_members AS (
    SELECT p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio, p.home_city, p.passport_points, u.created_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE p.deleted = false
  ),
  active_locations AS (
    SELECT l.id, l.name, l.address, l.inserted_at
    FROM public.locations l
    JOIN active_members member ON member.id = l.created_by
  ),
  active_reviews AS (
    SELECT r.id, r.comment, r.taste, r.presentation, r.inserted_at, r.state,
      r.user_id, r.location
    FROM public.reviews r
    JOIN active_members member ON member.id = r.user_id
    JOIN active_locations location ON location.id = r.location
    WHERE r.state = 1
  ),
  like_counts AS (
    SELECT review_id, count(*) AS likes
    FROM public.likes
    GROUP BY review_id
  ),
  comment_counts AS (
    SELECT review_id, count(*) AS comments
    FROM public.comments
    GROUP BY review_id
  ),
  review_cards AS (
    SELECT review.id, review.inserted_at,
      COALESCE(likes.likes, 0) AS likes,
      COALESCE(comments.comments, 0) AS comments,
      jsonb_build_object(
        'id', review.id,
        'comment', review.comment,
        'taste', review.taste,
        'presentation', review.presentation,
        'inserted_at', review.inserted_at,
        'state', review.state,
        'location', jsonb_build_object(
          'id', location.id,
          'name', location.name
        ),
        'profile', jsonb_build_object(
          'id', member.id,
          'username', member.username,
          'name', member.name,
          'avatar_url', member.avatar_url,
          'is_verified', member.is_verified,
          'deleted', member.deleted,
          'deleted_at', member.deleted_at,
          'review_count', member.review_count,
          'passport_points', member.passport_points,
          'home_city', member.home_city,
          'bio', member.bio
        ),
        'engagement', jsonb_build_object(
          'likes', COALESCE(likes.likes, 0),
          'comments', COALESCE(comments.comments, 0),
          'shares', 0
        ),
        'likes', COALESCE(likes.likes, 0),
        'comments', COALESCE(comments.comments, 0)
      ) AS card
    FROM active_reviews review
    JOIN active_members member ON member.id = review.user_id
    JOIN active_locations location ON location.id = review.location
    LEFT JOIN like_counts likes ON likes.review_id = review.id
    LEFT JOIN comment_counts comments ON comments.review_id = review.id
  ),
  location_rankings AS (
    SELECT location.id, location.name,
      count(review.id) AS total_ratings,
      round(
        avg((review.taste + review.presentation)::numeric / 2)
          FILTER (WHERE review.taste IS NOT NULL AND review.presentation IS NOT NULL),
        1
      ) AS rating
    FROM active_locations location
    JOIN active_reviews review ON review.location = location.id
    GROUP BY location.id, location.name
  )
  SELECT jsonb_build_object(
    'latest', jsonb_build_object(
      'members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', member.id,
          'username', member.username,
          'name', member.name,
          'avatar_url', member.avatar_url,
          'is_verified', member.is_verified,
          'deleted', member.deleted,
          'deleted_at', member.deleted_at,
          'review_count', member.review_count,
          'passport_points', member.passport_points,
          'home_city', member.home_city,
          'bio', member.bio,
          'created_at', member.created_at
        ) ORDER BY member.created_at DESC, member.id DESC)
        FROM (
          SELECT * FROM active_members
          ORDER BY created_at DESC, id DESC
          LIMIT (SELECT limit_value FROM params)
        ) member
      ), '[]'::jsonb),
      'reviews', COALESCE((
        SELECT jsonb_agg(card ORDER BY inserted_at DESC, id DESC)
        FROM (
          SELECT card, inserted_at, id FROM review_cards
          ORDER BY inserted_at DESC, id DESC
          LIMIT (SELECT limit_value FROM params)
        ) latest_reviews
      ), '[]'::jsonb),
      'locations', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', location.id,
          'name', location.name,
          'address', location.address,
          'inserted_at', location.inserted_at
        ) ORDER BY location.inserted_at DESC NULLS LAST, location.id DESC)
        FROM (
          SELECT * FROM active_locations
          ORDER BY inserted_at DESC NULLS LAST, id DESC
          LIMIT (SELECT limit_value FROM params)
        ) location
      ), '[]'::jsonb)
    ),
    'top', jsonb_build_object(
      'members', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', member.id,
          'username', member.username,
          'name', member.name,
          'avatar_url', member.avatar_url,
          'is_verified', member.is_verified,
          'deleted', member.deleted,
          'deleted_at', member.deleted_at,
          'review_count', member.review_count,
          'passport_points', member.passport_points,
          'home_city', member.home_city,
          'bio', member.bio
        ) ORDER BY member.review_count DESC NULLS LAST, member.id)
        FROM (
          SELECT * FROM active_members
          ORDER BY review_count DESC NULLS LAST, id
          LIMIT (SELECT limit_value FROM params)
        ) member
      ), '[]'::jsonb),
      'reviews', COALESCE((
        SELECT jsonb_agg(card ORDER BY likes DESC, comments DESC, id DESC)
        FROM (
          SELECT card, likes, comments, id FROM review_cards
          ORDER BY likes DESC, comments DESC, id DESC
          LIMIT (SELECT limit_value FROM params)
        ) top_reviews
      ), '[]'::jsonb),
      'locations', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'id', location.id,
          'name', location.name,
          'rating', location.rating,
          'total_ratings', location.total_ratings
        ) ORDER BY location.rating DESC, location.total_ratings DESC, location.id)
        FROM (
          SELECT * FROM location_rankings
          WHERE total_ratings >= 2 AND rating IS NOT NULL
          ORDER BY rating DESC, total_ratings DESC, id
          LIMIT (SELECT limit_value FROM params)
        ) location
      ), '[]'::jsonb)
    )
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_profiles_page(p_search text DEFAULT NULL::text, p_status text DEFAULT NULL::text, p_sort text DEFAULT 'review_count'::text, p_direction text DEFAULT 'desc'::text, p_page integer DEFAULT 1, p_per_page integer DEFAULT 50)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  WITH params AS (
    SELECT
      NULLIF(btrim(p_search), '') AS search_text,
      NULLIF(btrim(p_status), '') AS status_text,
      CASE
        WHEN p_sort IN ('username', 'rank', 'review_count', 'deleted', 'created_at', 'last_review_at')
          THEN p_sort
        ELSE 'review_count'
      END AS sort_column,
      CASE WHEN lower(p_direction) = 'asc' THEN 'asc' ELSE 'desc' END AS sort_direction,
      greatest(1, COALESCE(p_page, 1)) AS page_value,
      greatest(1, least(COALESCE(p_per_page, 50), 100)) AS per_page_value
  ),
  profile_rows AS (
    SELECT p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio, p.home_city, p.passport_points,
      u.email, u.created_at, u.last_sign_in_at,
      max(review.inserted_at) AS last_review_at
    FROM public.profiles p
    JOIN auth.users u ON u.id = p.id
    LEFT JOIN public.reviews review
      ON review.user_id = p.id AND review.state = 1
    CROSS JOIN params
    WHERE (params.search_text IS NULL OR p.username ILIKE '%' || params.search_text || '%')
      AND (
        params.status_text IS NULL
        OR (params.status_text = 'active' AND p.deleted = false)
        OR (params.status_text = 'deleted' AND p.deleted = true)
        OR (params.status_text = 'verified' AND p.is_verified = true)
      )
    GROUP BY p.id, p.username, p.name, p.avatar_url, p.is_verified,
      p.deleted, p.deleted_at, p.review_count, p.bio, p.home_city, p.passport_points,
      u.email, u.created_at, u.last_sign_in_at
  ),
  paged AS (
    SELECT profile_rows.*
    FROM profile_rows
    CROSS JOIN params
    ORDER BY
      CASE WHEN params.sort_column = 'review_count' AND params.sort_direction = 'asc' THEN review_count END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'rank' AND params.sort_direction = 'asc' THEN passport_points END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'review_count' AND params.sort_direction = 'desc' THEN review_count END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'rank' AND params.sort_direction = 'desc' THEN passport_points END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'username' AND params.sort_direction = 'asc' THEN username END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'username' AND params.sort_direction = 'desc' THEN username END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'deleted' AND params.sort_direction = 'asc' THEN deleted END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'deleted' AND params.sort_direction = 'desc' THEN deleted END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'created_at' AND params.sort_direction = 'asc' THEN created_at END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'created_at' AND params.sort_direction = 'desc' THEN created_at END DESC NULLS LAST,
      CASE WHEN params.sort_column = 'last_review_at' AND params.sort_direction = 'asc' THEN last_review_at END ASC NULLS LAST,
      CASE WHEN params.sort_column = 'last_review_at' AND params.sort_direction = 'desc' THEN last_review_at END DESC NULLS LAST,
      id ASC
    LIMIT (SELECT per_page_value FROM params)
    OFFSET ((SELECT page_value FROM params) - 1) * (SELECT per_page_value FROM params)
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM profile_rows),
    'profiles', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', id,
        'username', username,
        'name', name,
        'avatar_url', avatar_url,
        'is_verified', is_verified,
        'deleted', deleted,
        'deleted_at', deleted_at,
        'review_count', review_count,
        'passport_points', passport_points,
        'home_city', home_city,
        'bio', bio,
        'email', email,
        'created_at', created_at,
        'last_sign_in_at', last_sign_in_at,
        'last_review_at', last_review_at
      ))
      FROM paged
    ), '[]'::jsonb)
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_profile_detail(p_id uuid)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'auth', 'pg_temp'
AS $function$
  SELECT CASE WHEN profile.id IS NULL THEN NULL ELSE jsonb_build_object(
    'id', profile.id,
    'username', profile.username,
    'name', profile.name,
    'avatar_url', profile.avatar_url,
    'is_verified', profile.is_verified,
    'deleted', profile.deleted,
    'deleted_at', profile.deleted_at,
    'review_count', profile.review_count,
    'passport_points', profile.passport_points,
    'home_city', profile.home_city,
    'bio', profile.bio,
    'email', auth_user.email,
    'created_at', auth_user.created_at,
    'last_sign_in_at', auth_user.last_sign_in_at
  ) END
  FROM public.profiles profile
  JOIN auth.users auth_user ON auth_user.id = profile.id
  WHERE profile.id = p_id;
$function$;

ALTER TABLE public.app_analytics_events DROP CONSTRAINT IF EXISTS app_analytics_events_event_name_check;
ALTER TABLE public.app_analytics_events ADD CONSTRAINT app_analytics_events_event_name_check
CHECK (event_name IN ('screen_home', 'screen_discover', 'screen_profile', 'screen_passport', 'screen_settings', 'screen_favorite_location', 'screen_edit_profile', 'screen_notifications', 'screen_martini_index', 'screen_activity', 'screen_review', 'screen_review_share_preview', 'screen_golden_glass_info', 'screen_location_verification_info', 'screen_passport_info', 'screen_location_claim', 'screen_place_info', 'screen_delete_account', 'screen_terms', 'screen_venue', 'screen_member', 'screen_review_detail', 'screen_followers', 'screen_following', 'discover_map_open', 'discover_golden_glass_open', 'discover_members_open', 'map_search_selected', 'directory_search', 'index_filter', 'index_generate', 'favorite_saved', 'favorite_removed', 'profile_favorites_open', 'profile_regulars_open', 'login', 'create_account', 'shared_app', 'share_review', 'share_location', 'new_review', 'edit_review', 'like_review', 'like_comment', 'view_location', 'comment_on_review', 'follow_user', 'view_profile', 'change_avatar', 'report', 'delete_review', 'logout', 'activity_open', 'activity_notification_open', 'activity_follow_back', 'activity_page_load', 'activity_load_error', 'visitor_preview_started', 'membership_gate_opened', 'membership_gate_dismissed', 'membership_auth_started', 'onboarding_completed', 'auth_unexpected_sign_out', 'auth_session_missing_at_launch', 'mention_suggestions_opened', 'mention_selected', 'mention_submitted','home_city_onboarding_opened','home_city_profile_opened','home_city_permission_granted','home_city_permission_denied','home_city_detected','home_city_selected','home_city_onboarding_saved','home_city_profile_saved','home_city_removed','home_city_skipped'));

INSERT INTO public.feature_usage_catalog (surface,event_name,label,kind) VALUES
('app','home_city_onboarding_opened','Home city onboarding opened','action'),
('app','home_city_profile_opened','Home city profile opened','action'),
('app','home_city_permission_granted','Home city permission granted','action'),
('app','home_city_permission_denied','Home city permission denied','action'),
('app','home_city_detected','Home city detected','action'),
('app','home_city_selected','Home city selected','action'),
('app','home_city_onboarding_saved','Home city onboarding saved','action'),
('app','home_city_profile_saved','Home city profile saved','action'),
('app','home_city_removed','Home city removed','action'),
('app','home_city_skipped','Home city skipped','action')
ON CONFLICT DO NOTHING;
NOTIFY pgrst, 'reload schema';
COMMIT;
