-- Lock down service-role-only RPCs that default privileges left callable by
-- app roles. The baseline schema's ALTER DEFAULT PRIVILEGES grants EXECUTE on
-- every new function to anon and authenticated directly, so a
-- `REVOKE ... FROM PUBLIC` (or no revoke at all) leaves those direct grants
-- standing. Every function below is SECURITY DEFINER and meant for the admin
-- dashboard's service-role client only:
--
--   * location_claim_notification could be called by any signed-in (or anon)
--     PostgREST client to insert an arbitrary-body admin_message notification
--     — with push delivery — into any member's feed.
--   * The get_admin_* projections expose admin-only fields (member emails,
--     moderation reports, pre-review search indexes) to the public API.

BEGIN;

REVOKE ALL ON FUNCTION public.location_claim_notification(
  uuid, uuid, bigint, text, text
) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION
  public.get_admin_dashboard_activity(integer),
  public.get_admin_notification_analytics(timestamptz),
  public.get_admin_moderation_reports(text, text, text, integer, integer),
  public.get_admin_review_engagement(bigint[]),
  public.get_admin_profiles_page(text, text, text, text, integer, integer),
  public.get_admin_profile_detail(uuid),
  public.get_admin_locations_page(text, integer, text, text, integer, integer),
  public.get_admin_reviews_page(text, text, integer, integer)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION
  public.location_claim_notification(uuid, uuid, bigint, text, text),
  public.get_admin_dashboard_activity(integer),
  public.get_admin_notification_analytics(timestamptz),
  public.get_admin_moderation_reports(text, text, text, integer, integer),
  public.get_admin_review_engagement(bigint[]),
  public.get_admin_profiles_page(text, text, text, text, integer, integer),
  public.get_admin_profile_detail(uuid),
  public.get_admin_locations_page(text, integer, text, text, integer, integer),
  public.get_admin_reviews_page(text, text, integer, integer)
TO service_role;

-- The claims page sorts pending claims first, but the outer jsonb_agg
-- re-sorted each page by submitted_at alone, discarding the pending-first
-- ordering within a mixed-status page. Re-create with matching sort keys.
CREATE OR REPLACE FUNCTION public.get_admin_location_claims_page(
  p_status text DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_page integer DEFAULT 1,
  p_per_page integer DEFAULT 50
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
  WITH filtered AS (
    SELECT c.*, l.name AS location_name, l.address AS location_address,
      p.id AS profile_id, p.username, p.name AS profile_name
    FROM public.location_claims c
    JOIN public.locations l ON l.id = c.location_id
    LEFT JOIN public.profiles p ON p.id = c.requester_profile_id
    WHERE (p_status IS NULL OR p_status = '' OR c.status = p_status)
      AND (p_search IS NULL OR p_search = '' OR (
        l.name ILIKE '%' || p_search || '%'
        OR COALESCE(l.address, '') ILIKE '%' || p_search || '%'
        OR COALESCE(p.username, '') ILIKE '%' || p_search || '%'
        OR COALESCE(c.account_email, '') ILIKE '%' || p_search || '%'
        OR COALESCE(c.business_email, '') ILIKE '%' || p_search || '%'
      ))
  ), paged AS (
    SELECT * FROM filtered
    ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
      submitted_at DESC, id DESC
    LIMIT greatest(1, least(COALESCE(p_per_page, 50), 100))
    OFFSET greatest(COALESCE(p_page, 1) - 1, 0) * greatest(1, least(COALESCE(p_per_page, 50), 100))
  )
  SELECT jsonb_build_object(
    'claims', COALESCE((SELECT jsonb_agg(to_jsonb(paged)
      ORDER BY CASE WHEN status = 'pending' THEN 0 ELSE 1 END,
        submitted_at DESC, id DESC) FROM paged), '[]'::jsonb),
    'total', (SELECT count(*) FROM filtered),
    'pendingCount', (SELECT count(*) FROM public.location_claims WHERE status = 'pending')
  );
$$;

REVOKE ALL ON FUNCTION public.get_admin_location_claims_page(text, text, integer, integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_location_claims_page(text, text, integer, integer)
  TO service_role;

COMMIT;
