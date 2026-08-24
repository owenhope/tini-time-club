/** An option row from the spirits/types lookup tables. */
export interface NamedOption {
  id: number;
  name: string;
}

/**
 * Canonical shape of a profiles-table row.
 *
 * favorite_spirits / favorite_types are id arrays, but legacy rows may hold a
 * JSON-encoded string of the same — parse defensively (see getFavoriteSpirits
 * in the profile screens).
 */
export interface Profile {
  id: string;
  username: string;
  name?: string | null;
  bio?: string | null;
  avatar_url?: string | null;
  is_verified?: boolean;
  favorite_spirits?: (number | string)[] | string | null;
  favorite_types?: (number | string)[] | string | null;
  favorite_location_id?: number | null;
  eula_accepted?: boolean | null;
  deleted?: boolean;
  weekly_push_notifications_enabled?: boolean;
  mention_notifications_enabled?: boolean;
  /** Whether signed-out visitors may discover this profile and its reviews. */
  is_public?: boolean;
  /** Active review count (trigger-maintained); drives the ranking ring. */
  review_count?: number;
}

/** A row from the location_ratings view (aggregates computed server-side). */
export interface LocationRating {
  id: number | string;
  name: string;
  address: string | null;
  lat: number | null;
  lon: number | null;
  rating: number;
  taste_avg: number;
  presentation_avg: number;
  total_ratings: number;
  is_golden_glass?: boolean;
  neighborhood?: string | null;
  region_id?: number | null;
}

/** Minimal author/commenter identity embedded in feed rows. */
export interface ReviewProfile {
  id: string;
  username: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  /** Active review count (trigger-maintained); drives the ranking ring. */
  review_count?: number;
}

export interface ReviewLocation {
  id: string;
  name: string;
  address?: string;
  /** Current aggregate TTC rating for this venue. */
  rating?: number | null;
  total_ratings?: number | null;
  /** Whether this venue is in the current Golden Glass snapshot. */
  is_golden_glass?: boolean;
}

/** A selected, identity-bound @mention inside a plain-text body.
 * Offsets use JavaScript UTF-16 indices so emoji and caret positions match
 * React Native's TextInput selection contract. */
export interface MentionSpan {
  profileId: string;
  username: string;
  start: number;
  length: number;
}

export type MentionRelationship =
  "mutual" | "following" | "follows_you" | "recent" | "everyone";

export interface MentionCandidate {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  isVerified: boolean;
  reviewCount: number;
  relationship: MentionRelationship;
}

export interface Comment {
  id: number;
  body: string;
  inserted_at: string;
  review_id?: number | string;
  user_id?: string;
  profile?: ReviewProfile;
  likes_count?: number;
  has_liked?: boolean;
  mentions?: MentionSpan[];
}

/**
 * A feed row as returned by the feed_reviews RPC (see supabase/migrations),
 * with image_url already hydrated to a signed URL by
 * databaseService.getReviews.
 */
export interface Review {
  id: string;
  comment: string;
  image_url: string;
  inserted_at: string;
  taste: number;
  presentation: number;
  user_id: string;
  location: ReviewLocation;
  spirit: NamedOption | { name: string };
  type: NamedOption | { name: string };
  profile: ReviewProfile;
  // Engagement, computed server-side per viewer.
  likes_count?: number;
  comments_count?: number;
  has_liked?: boolean;
  recent_comments?: Comment[];
  mentions?: MentionSpan[];
}
