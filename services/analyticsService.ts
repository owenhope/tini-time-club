import { log } from "@/utils/log";
/**
 * Analytics facade.
 *
 * Third-party analytics (PostHog) has been removed; a custom in-house
 * analytics platform will back this interface eventually. The call sites and
 * event taxonomy are kept so instrumentation points don't have to be
 * rediscovered — until then, events are logged in dev and dropped in prod.
 */

type AnalyticEventType =
  | "login"
  | "create_account"
  | "shared_app"
  | "share_review"
  | "share_location"
  | "new_review"
  | "edit_review"
  | "like_review"
  | "like_comment"
  | "view_location"
  | "comment_on_review"
  | "follow_user"
  | "view_profile"
  | "change_avatar"
  | "report"
  | "delete_review"
  | "logout"
  | "activity_open"
  | "activity_notification_open"
  | "activity_follow_back"
  | "activity_page_load"
  | "activity_load_error"
  | "visitor_preview_started"
  | "membership_gate_opened"
  | "membership_gate_dismissed"
  | "membership_auth_started";

const AnalyticService = {
  capture: (event: AnalyticEventType, properties?: Record<string, any>) => {
    log(`[Analytics] ${event}`, properties ?? {});
  },

  identify: (_userId: string, _properties?: Record<string, any>) => {},

  reset: () => {},
};

export default AnalyticService;
