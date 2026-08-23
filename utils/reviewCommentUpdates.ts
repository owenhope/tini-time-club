import type { Comment, Review } from "@/types/types";

type ReviewWithCommentPatch = Review & {
  _commentPatch?:
    { action: "add"; data: Comment } | { action: "delete"; id: number };
};

export const addReviewComment = (
  review: ReviewWithCommentPatch,
  comment: Comment
): ReviewWithCommentPatch => ({
  ...review,
  comments_count:
    review._commentPatch?.action === "add" &&
    review._commentPatch.data.id === comment.id
      ? review.comments_count
      : (review.comments_count ?? 0) + 1,
  recent_comments: [
    comment,
    ...(review.recent_comments ?? []).filter((item) => item.id !== comment.id),
  ].slice(0, 2),
  _commentPatch: { action: "add", data: comment },
});

export const deleteReviewComment = (
  review: ReviewWithCommentPatch,
  commentId: number
): ReviewWithCommentPatch => ({
  ...review,
  comments_count:
    review._commentPatch?.action === "delete" &&
    review._commentPatch.id === commentId
      ? review.comments_count
      : Math.max(0, (review.comments_count ?? 0) - 1),
  recent_comments: (review.recent_comments ?? []).filter(
    (comment) => comment.id !== commentId
  ),
  _commentPatch: { action: "delete", id: commentId },
});
