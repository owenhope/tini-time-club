import type { Review } from "@/types/types";
import { decodeMemberSummary } from "@/utils/memberSummary";
import { decodeCommentList } from "@/utils/commentDecoder";

/** Normalize member projections for every review read, including cached rows. */
export function decodeReviewMembers(review: Review): Review {
  const member = decodeMemberSummary(review.profile);
  return {
    ...review,
    profile:
      member && (!review.user_id || member.id === review.user_id)
        ? member
        : undefined,
    ...(review.recent_comments !== undefined
      ? { recent_comments: decodeCommentList(review.recent_comments) }
      : {}),
  };
}
