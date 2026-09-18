import type { Comment, MentionSpan } from "@/types/types";
import { decodeMemberSummary, type MemberSummary } from "@/utils/memberSummary";

export interface DecodedComment extends Comment {
  profile?: MemberSummary;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const decodeMention = (value: unknown): MentionSpan | null => {
  if (
    !isRecord(value) ||
    typeof value.profileId !== "string" ||
    typeof value.username !== "string" ||
    typeof value.start !== "number" ||
    typeof value.length !== "number"
  )
    return null;
  if (
    !Number.isInteger(value.start) ||
    value.start < 0 ||
    !Number.isInteger(value.length) ||
    value.length <= 0
  )
    return null;
  return {
    profileId: value.profileId,
    username: value.username,
    start: value.start,
    length: value.length,
  };
};

/** Decode comment responses consistently across reads and writes. */
export function decodeComment(value: unknown): DecodedComment | null {
  if (
    !isRecord(value) ||
    typeof value.id !== "number" ||
    !Number.isSafeInteger(value.id) ||
    typeof value.body !== "string" ||
    typeof value.inserted_at !== "string"
  )
    return null;
  const member = decodeMemberSummary(value.profile);
  const userId = typeof value.user_id === "string" ? value.user_id : undefined;
  return {
    id: value.id,
    body: value.body,
    inserted_at: value.inserted_at,
    ...(typeof value.review_id === "string" ||
    typeof value.review_id === "number"
      ? { review_id: value.review_id }
      : {}),
    ...(userId ? { user_id: userId } : {}),
    // Never assign another member's rank to this comment when identities disagree.
    ...(member && (!userId || member.id === userId) ? { profile: member } : {}),
    ...(typeof value.likes_count === "number" &&
    Number.isFinite(value.likes_count)
      ? { likes_count: value.likes_count }
      : {}),
    ...(typeof value.has_liked === "boolean"
      ? { has_liked: value.has_liked }
      : {}),
    ...(Array.isArray(value.mentions)
      ? {
          mentions: value.mentions
            .map(decodeMention)
            .filter((mention): mention is MentionSpan => mention !== null),
        }
      : {}),
  };
}

export function decodeCommentList(value: unknown): DecodedComment[] {
  return Array.isArray(value)
    ? value
        .map(decodeComment)
        .filter((comment): comment is DecodedComment => comment !== null)
    : [];
}
