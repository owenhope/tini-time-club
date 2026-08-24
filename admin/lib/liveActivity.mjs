const EVENT_PRESENTATION = {
  login: ["Signed in", "Account", "green"],
  create_account: ["Created an account", "Account", "green"],
  logout: ["Signed out", "Account", "muted"],
  onboarding_completed: ["Completed onboarding", "Account", "green"],
  new_review: ["Posted a review", "Reviews", "green"],
  edit_review: ["Edited a review", "Reviews", "purple"],
  delete_review: ["Deleted a review", "Reviews", "red"],
  like_review: ["Liked a review", "Social", "purple"],
  like_comment: ["Liked a comment", "Social", "purple"],
  comment_on_review: ["Commented on a review", "Social", "purple"],
  mention_suggestions_opened: ["Opened member mentions", "Social", "muted"],
  mention_selected: ["Selected a member mention", "Social", "purple"],
  mention_submitted: ["Posted with a member mention", "Social", "purple"],
  follow_user: ["Followed a member", "Social", "purple"],
  view_profile: ["Viewed a profile", "Browsing", "muted"],
  view_location: ["Viewed a place", "Browsing", "muted"],
  shared_app: ["Shared the app", "Sharing", "green"],
  share_review: ["Shared a review", "Sharing", "green"],
  share_location: ["Shared a place", "Sharing", "green"],
  activity_open: ["Opened activity", "Browsing", "muted"],
  activity_notification_open: ["Opened an activity alert", "Browsing", "muted"],
  activity_follow_back: ["Followed back from activity", "Social", "purple"],
  activity_page_load: ["Loaded activity", "Browsing", "muted"],
  activity_load_error: ["Activity failed to load", "Health", "red"],
  visitor_preview_started: ["Started visitor preview", "Visitor", "muted"],
  membership_gate_opened: ["Reached the membership gate", "Visitor", "purple"],
  membership_gate_dismissed: [
    "Dismissed the membership gate",
    "Visitor",
    "muted",
  ],
  membership_auth_started: ["Started membership sign-in", "Visitor", "green"],
  change_avatar: ["Updated their avatar", "Profile", "purple"],
  report: ["Submitted a report", "Moderation", "red"],
  auth_unexpected_sign_out: [
    "Lost authentication unexpectedly",
    "Health",
    "red",
  ],
  auth_session_missing_at_launch: [
    "Launched with a missing session",
    "Health",
    "red",
  ],
};

const unavailableCodes = new Set(["PGRST205", "42P01"]);

/**
 * Turn raw, service-role-only event rows into the intentionally limited model
 * rendered by the Live screen. Installation and session identifiers never
 * cross this interface.
 *
 * @param {Array<Record<string, any>> | null} rows
 * @param {{code?: string, message: string} | null} error
 * @param {Array<{id: string, username?: string | null, name?: string | null}>} profiles
 */
export const resolveLiveActivityResponse = (rows, error, profiles = []) => {
  if (error) {
    if (unavailableCodes.has(error.code ?? "")) {
      return { available: false, events: [] };
    }
    throw new Error(`Unable to load live activity: ${error.message}`);
  }

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, profile])
  );
  return {
    available: true,
    events: (rows ?? []).map((row) => {
      const presentation = EVENT_PRESENTATION[row.event_name] ?? [
        String(row.event_name ?? "Unknown action").replaceAll("_", " "),
        "Other",
        "muted",
      ];
      const profile = row.user_id ? profilesById.get(row.user_id) : null;
      return {
        id: String(row.id),
        occurredAt: String(row.occurred_at),
        action: presentation[0],
        category: presentation[1],
        tone: presentation[2],
        actorId: profile?.id ?? null,
        actor: profile?.username
          ? `@${profile.username}`
          : profile?.name || (row.user_id ? "Member" : "Anonymous visitor"),
        platform: String(row.platform ?? "unknown"),
        appVersion: row.app_version ? String(row.app_version) : "unknown",
        appEnvironment: row.app_environment
          ? String(row.app_environment)
          : "unknown",
      };
    }),
  };
};
