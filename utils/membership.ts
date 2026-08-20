export type MembershipIntent =
  | "profile"
  | "review"
  | "like-review"
  | "like-comment"
  | "comment"
  | "follow"
  | "report"
  | "pick-one"
  | "activity"
  | "people-feed"
  | "top-places"
  | "members-directory"
  | "location-details"
  | "social-list"
  | "share-review"
  | "share-location"
  | "share-profile";

export interface MembershipPromptCopy {
  eyebrow: string;
  title: string;
  body: string;
}

const DEFAULT_COPY: MembershipPromptCopy = {
  eyebrow: "MEMBERS ONLY",
  title: "Join the club",
  body: "Create your profile to take part in Tini Time Club.",
};

const PROMPT_COPY: Record<MembershipIntent, MembershipPromptCopy> = {
  profile: {
    eyebrow: "YOUR PROFILE",
    title: "Join the club",
    body: "Create a profile, keep your reviews together, earn rings, and become a Regular.",
  },
  review: {
    eyebrow: "POST A REVIEW",
    title: "Ready to give your verdict?",
    body: "Join the club to rate your Martini and add it to the record.",
  },
  "like-review": {
    eyebrow: "LIKE A REVIEW",
    title: "A little love is a club perk",
    body: "Join the club to like this review and support its author.",
  },
  "like-comment": {
    eyebrow: "LIKE A COMMENT",
    title: "Join the conversation",
    body: "Create your profile to like comments from other members.",
  },
  comment: {
    eyebrow: "LEAVE A COMMENT",
    title: "Pull up a stool",
    body: "Join the club to add your voice to this review.",
  },
  follow: {
    eyebrow: "FOLLOW A MEMBER",
    title: "Keep up with their pours",
    body: "Create your profile to follow members and build your people feed.",
  },
  report: {
    eyebrow: "REPORT CONTENT",
    title: "Help keep the club thoughtful",
    body: "Join or sign in before submitting a report.",
  },
  "pick-one": {
    eyebrow: "PICK ONE",
    title: "Let fate hold the shaker",
    body: "The Martini picker is a members-only club perk.",
  },
  activity: {
    eyebrow: "YOUR ACTIVITY",
    title: "See what the club sends your way",
    body: "Join to receive likes, comments, follows, and club updates.",
  },
  "people-feed": {
    eyebrow: "YOUR PEOPLE",
    title: "Build a feed around your crowd",
    body: "Join the club and follow members to see their latest reviews here.",
  },
  "top-places": {
    eyebrow: "TOP PLACES",
    title: "See what the club recommends",
    body: "Join or sign in to explore the places members rate highest.",
  },
  "members-directory": {
    eyebrow: "THE MEMBERS",
    title: "Meet the club",
    body: "Join or sign in to browse members and find people to follow.",
  },
  "location-details": {
    eyebrow: "PLACE DETAILS",
    title: "Go beyond the map",
    body: "Join or sign in to open the full location and meet its Regulars.",
  },
  "social-list": {
    eyebrow: "THE SOCIAL GRAPH",
    title: "Meet the rest of the club",
    body: "Join or sign in to see followers, following, and likes.",
  },
  "share-review": {
    eyebrow: "SHARE A REVIEW",
    title: "Sharing is for members",
    body: "Join the club before sending a review outside the app.",
  },
  "share-location": {
    eyebrow: "SHARE A LOCATION",
    title: "Sharing is for members",
    body: "Join the club before sending a location outside the app.",
  },
  "share-profile": {
    eyebrow: "SHARE A PROFILE",
    title: "Sharing is for members",
    body: "Join the club before sending a member profile outside the app.",
  },
};

export const getMembershipPromptCopy = (
  intent: string | string[] | undefined
): MembershipPromptCopy => {
  const value = Array.isArray(intent) ? intent[0] : intent;
  return value && value in PROMPT_COPY
    ? PROMPT_COPY[value as MembershipIntent]
    : DEFAULT_COPY;
};

export const isMembershipIntent = (
  value: string | undefined
): value is MembershipIntent => Boolean(value && value in PROMPT_COPY);

/** Only internal app destinations may survive the external auth round-trip. */
export const safeMembershipReturnPath = (
  value: string | null | undefined
): string | null => {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (/^\/(auth|onboarding|membership)(\/|$)/.test(value)) return null;
  return value;
};

/** Defense-in-depth for member-only routes reached by a deep link. */
export const getVisitorGatedRouteIntent = (
  pathname: string
): MembershipIntent | null => {
  if (pathname === "/review") return "review";
  if (pathname === "/review-share-preview") return "share-review";
  if (pathname === "/activity") return "activity";
  if (/^\/users\/[^/]+\/(followers|following)$/.test(pathname)) {
    return "social-list";
  }
  if (
    /^\/(settings|notifications|delete-account|edit-profile|favorite-location)$/.test(
      pathname
    )
  ) {
    return "profile";
  }
  return null;
};
