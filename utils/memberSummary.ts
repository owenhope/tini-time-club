import { normalizePassportPoints } from "@/utils/ranking";

/** Identity and rank inputs shared by member avatars; null points are unknown. */
export interface MemberSummary {
  id: string;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  passport_points: number | null;
  review_count?: number;
}

/** Decode the profiles projection without forwarding unrelated profile fields. */
export function decodeMemberSummary(value: unknown): MemberSummary | null {
  if (typeof value !== "object" || value === null || !("id" in value))
    return null;
  if (typeof value.id !== "string" || !value.id.trim()) return null;
  const record = value as Record<string, unknown>;
  return {
    id: value.id,
    username:
      typeof record.username === "string" && record.username.trim()
        ? record.username
        : "Unknown",
    avatar_url:
      typeof record.avatar_url === "string" && record.avatar_url.trim()
        ? record.avatar_url
        : null,
    is_verified: record.is_verified === true,
    passport_points: normalizePassportPoints(record.passport_points),
    ...(typeof record.review_count === "number" &&
    Number.isFinite(record.review_count) &&
    record.review_count >= 0
      ? { review_count: record.review_count }
      : {}),
  };
}
