/** Only coarse allowlisted names cross the telemetry boundary. */
export const ADMIN_PAGE_EVENTS = [
  "page_dashboard",
  "page_live",
  "page_health",
  "page_users",
  "page_reviews",
  "page_places",
  "page_places_map",
  "page_regions",
  "page_golden_glass",
  "page_analytics",
  "page_analytics_growth",
  "page_analytics_engagement",
  "page_analytics_content",
  "page_analytics_passport",
  "page_analytics_features",
  "page_notifications",
  "page_claims",
  "page_inquiries",
  "page_reports",
  "page_emails",
  "page_share_preview",
];
export const ADMIN_ACTION_EVENTS = [
  "action_member_verified",
  "action_member_deleted",
  "action_review_status",
  "action_report_status",
  "action_report_resolved",
  "action_place_updated",
  "action_claim_approved",
  "action_claim_rejected",
  "action_place_verified",
  "action_verification_revoked",
  "action_verification_restored",
  "action_manager_added",
  "action_manager_removed",
  "action_region_saved",
  "action_golden_glass_refreshed",
  "action_inquiry_updated",
  "action_notification_sent",
  "action_email_draft_saved",
  "action_email_batch_processed",
];

export function adminPageEvent(pathname) {
  const path = pathname.replace(/\/$/, "");
  if (path === "/admin") return "page_dashboard";
  if (/^\/admin\/places\/(?:golden-glass\/)?regions(?:\/[^/]+)?$/.test(path))
    return "page_regions";
  if (path === "/admin/places/golden-glass") return "page_golden_glass";
  if (path === "/admin/places/map") return "page_places_map";
  if (
    /^\/admin\/analytics(?:\/(growth|engagement|content|passport|features))?$/.test(
      path
    )
  )
    return path === "/admin/analytics"
      ? "page_analytics"
      : `page_analytics_${path.split("/").at(-1)}`;
  const match = path.match(
    /^\/admin\/(live|health|users|reviews|places|locations|notifications|claims|inquiries|reports|emails|share-preview)(?:\/[^/]+)?$/
  );
  if (!match) return null;
  return `page_${match[1] === "locations" ? "places" : match[1].replaceAll("-", "_")}`;
}

export function usageEnvironment(value) {
  return ["production", "preview", "development"].includes(value)
    ? value
    : "development";
}

export function validPageUsage(body) {
  return (
    !!body &&
    typeof body.id === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      body.id
    ) &&
    ADMIN_PAGE_EVENTS.includes(body.event)
  );
}
