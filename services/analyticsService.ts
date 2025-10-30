import PostHog from "posthog-react-native";

const posthog = new PostHog("phc_QwdU4jjdeNaNc4pafgLb6fsvnzOC0MLflISUONjGR2E", {
  host: "https://us.i.posthog.com",
});

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
  capture: (
    event: AnalyticEventType,
    properties?: Record<string, unknown>
  ) => {
    posthog.capture(event, properties);
  },

  identify: (userId: string, email: string, phone: string, name: string) => {
    posthog.identify(userId, { email, phone, name });
  },

  reset: () => {
    posthog.reset();
  },
};

export default AnalyticService;
