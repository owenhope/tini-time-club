export interface AdminProfile {
  id: string;
  username: string | null;
  name: string | null;
  avatar_url: string | null;
  is_verified: boolean | null;
  deleted: boolean | null;
  deleted_at: string | null;
  review_count: number | null;
  bio: string | null;
  email?: string;
  created_at?: string;
  last_sign_in_at?: string;
  last_review_at?: string;
}

export interface NotificationAudienceMember {
  id: string;
  username: string | null;
  name: string | null;
}

export type ProfileSort =
  | "username"
  | "rank"
  | "review_count"
  | "deleted"
  | "created_at"
  | "last_review_at";

export type SortDirection = "asc" | "desc";

export interface ProfileCounts {
  total: number;
  verified: number;
  deleted: number;
}
