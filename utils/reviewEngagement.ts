import type { Comment, Review } from "@/types/types";

export type ReviewCommentPatch =
  { action: "add"; data: Comment } | { action: "delete"; id: number };

export type ReviewWithCommentPatch = Review & {
  _commentPatch?: ReviewCommentPatch;
};

const MAX_PREVIEW_COMMENTS = 1;

export const buildReviewPreviewComments = (
  review: ReviewWithCommentPatch,
  overrides: Record<number, Pick<Comment, "has_liked" | "likes_count">>
): Comment[] => {
  const recentComments = [...(review.recent_comments ?? [])];
  const commentPatch = review._commentPatch;
  const patchedRecentComments =
    commentPatch?.action === "add"
      ? [
          commentPatch.data,
          ...recentComments.filter(
            (comment) => comment.id !== commentPatch.data.id
          ),
        ]
      : commentPatch?.action === "delete"
        ? recentComments.filter((comment) => comment.id !== commentPatch.id)
        : recentComments;

  return patchedRecentComments
    .slice(0, MAX_PREVIEW_COMMENTS)
    .reverse()
    .map((comment) => ({
      ...comment,
      ...overrides[comment.id],
    }));
};
