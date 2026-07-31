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
  | "new_review"
  | "like_review"
  | "view_location"
  | "comment_on_review"
  | "follow_user"
  | "view_profile"
  | "change_avatar"
  | "report"
  | "delete_review"
  | "logout";

const AnalyticService = {
  capture: (event: AnalyticEventType, properties?: Record<string, any>) => {
    if (__DEV__) {
      console.log(`[Analytics] ${event}`, properties ?? {});
    }
  },

  identify: (_userId: string, _properties?: Record<string, any>) => {},

  reset: () => {},
};

export default AnalyticService;
