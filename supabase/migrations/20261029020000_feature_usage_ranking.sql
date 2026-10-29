-- Additive first-party screen/action analytics. Historical events stay intact.
ALTER TABLE public.app_analytics_events DROP CONSTRAINT IF EXISTS app_analytics_events_event_name_check;
ALTER TABLE public.app_analytics_events ADD CONSTRAINT app_analytics_events_event_name_check
CHECK (event_name IN ('screen_home', 'screen_discover', 'screen_profile', 'screen_passport', 'screen_settings', 'screen_favorite_location', 'screen_edit_profile', 'screen_notifications', 'screen_martini_index', 'screen_activity', 'screen_review', 'screen_review_share_preview', 'screen_golden_glass_info', 'screen_location_verification_info', 'screen_passport_info', 'screen_location_claim', 'screen_place_info', 'screen_delete_account', 'screen_terms', 'screen_venue', 'screen_member', 'screen_review_detail', 'screen_followers', 'screen_following', 'discover_map_open', 'discover_golden_glass_open', 'discover_members_open', 'map_search_selected', 'directory_search', 'index_filter', 'index_generate', 'favorite_saved', 'favorite_removed', 'profile_favorites_open', 'profile_regulars_open', 'login', 'create_account', 'shared_app', 'share_review', 'share_location', 'new_review', 'edit_review', 'like_review', 'like_comment', 'view_location', 'comment_on_review', 'follow_user', 'view_profile', 'change_avatar', 'report', 'delete_review', 'logout', 'activity_open', 'activity_notification_open', 'activity_follow_back', 'activity_page_load', 'activity_load_error', 'visitor_preview_started', 'membership_gate_opened', 'membership_gate_dismissed', 'membership_auth_started', 'onboarding_completed', 'auth_unexpected_sign_out', 'auth_session_missing_at_launch', 'mention_suggestions_opened', 'mention_selected', 'mention_submitted'));

CREATE TABLE public.feature_usage_catalog (
  surface text NOT NULL CHECK (surface IN ('app','admin')),
  event_name text NOT NULL,
  label text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('screen','action')),
  PRIMARY KEY (surface,event_name)
);
ALTER TABLE public.feature_usage_catalog ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.feature_usage_catalog FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.feature_usage_catalog TO service_role;
INSERT INTO public.feature_usage_catalog (surface,event_name,label,kind) VALUES
  ('app', 'screen_home', 'Home feed', 'screen'),
  ('app', 'screen_discover', 'Discover', 'screen'),
  ('app', 'screen_profile', 'My profile', 'screen'),
  ('app', 'screen_passport', 'Passport', 'screen'),
  ('app', 'screen_settings', 'Settings', 'screen'),
  ('app', 'screen_favorite_location', 'Favourite venue', 'screen'),
  ('app', 'screen_edit_profile', 'Edit profile', 'screen'),
  ('app', 'screen_notifications', 'Notification settings', 'screen'),
  ('app', 'screen_martini_index', 'Martini Index', 'screen'),
  ('app', 'screen_activity', 'Activity', 'screen'),
  ('app', 'screen_review', 'Review composer', 'screen'),
  ('app', 'screen_review_share_preview', 'Review share preview', 'screen'),
  ('app', 'screen_golden_glass_info', 'Golden Glass information', 'screen'),
  ('app', 'screen_location_verification_info', 'Venue verification information', 'screen'),
  ('app', 'screen_passport_info', 'Passport information', 'screen'),
  ('app', 'screen_location_claim', 'Claim a venue', 'screen'),
  ('app', 'screen_place_info', 'Venue information', 'screen'),
  ('app', 'screen_delete_account', 'Delete account', 'screen'),
  ('app', 'screen_terms', 'Terms', 'screen'),
  ('app', 'screen_venue', 'Venue pages', 'screen'),
  ('app', 'screen_member', 'Member profiles', 'screen'),
  ('app', 'screen_review_detail', 'Review details', 'screen'),
  ('app', 'screen_followers', 'Followers', 'screen'),
  ('app', 'screen_following', 'Following', 'screen'),
  ('app', 'discover_map_open', 'Discover map', 'screen'),
  ('app', 'discover_golden_glass_open', 'Golden Glass list', 'screen'),
  ('app', 'discover_members_open', 'Member directory', 'screen'),
  ('app', 'map_search_selected', 'Select map search result', 'action'),
  ('app', 'directory_search', 'Search member directory', 'action'),
  ('app', 'index_filter', 'Filter Martini Index', 'action'),
  ('app', 'index_generate', 'Generate Martini', 'action'),
  ('app', 'new_review', 'Publish a review', 'action'),
  ('app', 'edit_review', 'Edit a review', 'action'),
  ('app', 'like_review', 'Like a review', 'action'),
  ('app', 'like_comment', 'Like a comment', 'action'),
  ('app', 'comment_on_review', 'Comment on a review', 'action'),
  ('app', 'follow_user', 'Follow a member', 'action'),
  ('app', 'change_avatar', 'Change avatar', 'action'),
  ('app', 'report', 'Report content', 'action'),
  ('app', 'delete_review', 'Delete a review', 'action'),
  ('app', 'activity_notification_open', 'Open Activity notification', 'action'),
  ('app', 'activity_follow_back', 'Activity follow-back', 'action'),
  ('app', 'mention_submitted', 'Submit a mention', 'action'),
  ('app', 'share_location', 'Venue share attempt', 'action'),
  ('app', 'membership_gate_opened', 'Membership gate shown', 'action'),
  ('app', 'membership_auth_started', 'Start membership authentication', 'action'),
  ('app', 'onboarding_completed', 'Complete onboarding', 'action'),
  ('app', 'favorite_saved', 'Save favourite venue', 'action'),
  ('app', 'favorite_removed', 'Remove favourite venue', 'action'),
  ('app', 'profile_favorites_open', 'Profile favourites', 'screen'),
  ('app', 'profile_regulars_open', 'Profile regulars', 'screen'),
  ('app', 'share_review', 'Review share attempt', 'action'),
  ('app', 'shared_app', 'Share invitation', 'action'),
  ('admin', 'page_dashboard', 'Dashboard', 'screen'),
  ('admin', 'page_live', 'Live activity', 'screen'),
  ('admin', 'page_health', 'Health', 'screen'),
  ('admin', 'page_users', 'Members', 'screen'),
  ('admin', 'page_reviews', 'Reviews', 'screen'),
  ('admin', 'page_places', 'Places', 'screen'),
  ('admin', 'page_places_map', 'Places map', 'screen'),
  ('admin', 'page_regions', 'Regions', 'screen'),
  ('admin', 'page_golden_glass', 'Golden Glass', 'screen'),
  ('admin', 'page_analytics', 'Analytics overview', 'screen'),
  ('admin', 'page_analytics_growth', 'Growth analytics', 'screen'),
  ('admin', 'page_analytics_engagement', 'Engagement analytics', 'screen'),
  ('admin', 'page_analytics_content', 'Content analytics', 'screen'),
  ('admin', 'page_analytics_passport', 'Passport analytics', 'screen'),
  ('admin', 'page_analytics_features', 'Feature usage', 'screen'),
  ('admin', 'page_notifications', 'Notifications', 'screen'),
  ('admin', 'page_claims', 'Claims', 'screen'),
  ('admin', 'page_inquiries', 'Inquiries', 'screen'),
  ('admin', 'page_reports', 'Reports', 'screen'),
  ('admin', 'page_emails', 'Emails', 'screen'),
  ('admin', 'page_share_preview', 'Share preview', 'screen'),
  ('admin', 'action_member_verified', 'Change member verification', 'action'),
  ('admin', 'action_member_deleted', 'Change member deletion', 'action'),
  ('admin', 'action_review_status', 'Change review status', 'action'),
  ('admin', 'action_report_status', 'Change report status', 'action'),
  ('admin', 'action_report_resolved', 'Resolve reported content', 'action'),
  ('admin', 'action_place_updated', 'Update place', 'action'),
  ('admin', 'action_claim_approved', 'Approve claim', 'action'),
  ('admin', 'action_claim_rejected', 'Reject claim', 'action'),
  ('admin', 'action_place_verified', 'Verify place', 'action'),
  ('admin', 'action_verification_revoked', 'Revoke verification', 'action'),
  ('admin', 'action_verification_restored', 'Restore verification', 'action'),
  ('admin', 'action_manager_added', 'Add venue manager', 'action'),
  ('admin', 'action_manager_removed', 'Remove venue manager', 'action'),
  ('admin', 'action_region_saved', 'Save region', 'action'),
  ('admin', 'action_golden_glass_refreshed', 'Refresh Golden Glass', 'action'),
  ('admin', 'action_inquiry_updated', 'Update inquiry', 'action'),
  ('admin', 'action_notification_sent', 'Submit notification broadcast', 'action'),
  ('admin', 'action_email_draft_saved', 'Save email draft', 'action'),
  ('admin', 'action_email_batch_processed', 'Process email batch', 'action');

CREATE TABLE public.admin_usage_events (
  id uuid PRIMARY KEY,
  event_name text NOT NULL CHECK (event_name IN ('page_dashboard', 'page_live', 'page_health', 'page_users', 'page_reviews', 'page_places', 'page_places_map', 'page_regions', 'page_golden_glass', 'page_analytics', 'page_analytics_growth', 'page_analytics_engagement', 'page_analytics_content', 'page_analytics_passport', 'page_analytics_features', 'page_notifications', 'page_claims', 'page_inquiries', 'page_reports', 'page_emails', 'page_share_preview', 'action_member_verified', 'action_member_deleted', 'action_review_status', 'action_report_status', 'action_report_resolved', 'action_place_updated', 'action_claim_approved', 'action_claim_rejected', 'action_place_verified', 'action_verification_revoked', 'action_verification_restored', 'action_manager_added', 'action_manager_removed', 'action_region_saved', 'action_golden_glass_refreshed', 'action_inquiry_updated', 'action_notification_sent', 'action_email_draft_saved', 'action_email_batch_processed')),
  session_hash text NOT NULL CHECK (session_hash ~ '^[0-9a-f]{64}$'),
  app_environment text NOT NULL CHECK (app_environment IN ('production','preview','development')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_usage_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.admin_usage_events TO service_role;
CREATE INDEX admin_usage_environment_time_idx ON public.admin_usage_events(app_environment,occurred_at);
CREATE INDEX app_analytics_environment_time_idx ON public.app_analytics_events(app_environment,occurred_at);

CREATE OR REPLACE FUNCTION public.get_feature_usage_ranking(
  p_since date, p_until date, p_surface text DEFAULT 'app', p_environment text DEFAULT 'production'
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE result jsonb;
BEGIN
  IF p_since IS NULL OR p_until IS NULL OR p_since > p_until OR p_until - p_since >= 366 THEN
    RAISE EXCEPTION 'Analytics range must contain between 1 and 366 days';
  END IF;
  IF p_surface IS NULL OR p_surface NOT IN ('app','admin') OR p_environment IS NULL OR p_environment NOT IN ('production','preview','development') THEN
    RAISE EXCEPTION 'Invalid analytics surface or environment';
  END IF;
  WITH events AS (
    SELECT e.event_name, e.user_id::text AS member_id, e.installation_id::text AS installation_id,
           e.session_id::text AS session_id, e.occurred_at
    FROM public.app_analytics_events e
    WHERE p_surface = 'app' AND e.app_environment = p_environment
      AND e.occurred_at >= (p_since::timestamp AT TIME ZONE 'UTC')
      AND e.occurred_at < ((p_until + 1)::timestamp AT TIME ZONE 'UTC')
    UNION ALL
    SELECT e.event_name, NULL::text, NULL::text, e.session_hash, e.occurred_at
    FROM public.admin_usage_events e
    WHERE p_surface = 'admin' AND e.app_environment = p_environment
      AND e.occurred_at >= (p_since::timestamp AT TIME ZONE 'UTC')
      AND e.occurred_at < ((p_until + 1)::timestamp AT TIME ZONE 'UTC')
  ), counts AS (
    SELECT event_name, count(*) AS events, count(DISTINCT member_id) AS members,
           count(DISTINCT installation_id) AS installations,
           count(DISTINCT session_id) AS sessions, max(occurred_at) AS last_used
    FROM events GROUP BY event_name
  )
  SELECT jsonb_build_object(
    'rows', COALESCE(jsonb_agg(jsonb_build_object(
      'event', c.event_name, 'label', c.label, 'kind', c.kind,
      'events', COALESCE(n.events,0), 'members', COALESCE(n.members,0),
      'installations', COALESCE(n.installations,0), 'sessions', COALESCE(n.sessions,0),
      'lastUsed', n.last_used
    ) ORDER BY CASE WHEN p_surface = 'app' THEN COALESCE(n.members,0) ELSE COALESCE(n.sessions,0) END DESC,
      COALESCE(n.events,0) DESC, c.label), '[]'::jsonb)
  ) INTO result
  FROM public.feature_usage_catalog c LEFT JOIN counts n ON n.event_name = c.event_name
  WHERE c.surface = p_surface;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_feature_usage_ranking(date,date,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_usage_ranking(date,date,text,text) TO service_role;
