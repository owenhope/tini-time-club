import type { WebMentionSpan } from "@/lib/mentions";
import type { AdminProfile } from "@/lib/profileTypes";

export interface ReviewEngagement {
  likes: number;
  comments: number;
  shares: number;
}

export const emptyReviewEngagement = (): ReviewEngagement => ({
  likes: 0,
  comments: 0,
  shares: 0,
});

export interface AdminReview {
  id: string | number;
  comment: string | null;
  taste: number | null;
  presentation: number | null;
  inserted_at: string;
  state: number | null;
  location: { name: string | null } | null;
}

export interface AdminReviewRow {
  id: string;
  comment: string | null;
  taste: number | null;
  presentation: number | null;
  inserted_at: string;
  state: number | null;
  location: { id: number; name: string | null } | null;
  profile: AdminProfile | null;
  engagement: ReviewEngagement;
}

export interface AdminReviewDetail extends AdminReviewRow {
  image_url: string | null;
  image_public_url: string | null;
  location: { id: number; name: string | null; address: string | null } | null;
  spirit: { name: string | null } | null;
  type: { name: string | null } | null;
  engagement: ReviewEngagement;
  mentions: WebMentionSpan[];
}

export interface ReviewCounts {
  total: number;
  active: number;
  inactive: number;
}

export interface TopReview extends AdminReviewRow {
  likes: number;
  comments: number;
}
