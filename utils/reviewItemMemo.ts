import type { Comment, Review } from "@/types/types";

export interface ReviewItemMemoProps {
  review: Review & { _commentPatch?: any };
  canDelete: boolean;
  onDelete?: () => void;
  onEdit?: () => void;
  onShowLikes: (reviewId: string) => void;
  onShowComments: (
    reviewId: string,
    onCommentAdded: (reviewId: string, newComment: any) => void,
    onCommentDeleted: (reviewId: string, commentId: number) => void
  ) => void;
  onCommentAdded: (reviewId: string, newComment: any) => void;
  onCommentDeleted: (reviewId: string, commentId: number) => void;
  previewMode?: boolean;
}

const recentCommentsKey = (comments: Comment[] | undefined) =>
  (comments ?? []).map((comment) => ({
    id: comment.id,
    body: comment.body,
    insertedAt: comment.inserted_at,
    userId: comment.user_id,
    likesCount: comment.likes_count ?? 0,
    hasLiked: Boolean(comment.has_liked),
    profileId: comment.profile?.id,
    username: comment.profile?.username,
    avatarUrl: comment.profile?.avatar_url,
    isVerified: comment.profile?.is_verified,
    reviewCount: comment.profile?.review_count,
  }));

const optionId = (
  option: Review["spirit"] | Review["type"] | null | undefined
) => {
  if (!option || typeof option !== "object") return undefined;
  return (option as { id?: number }).id;
};

export const areReviewItemPropsEqual = (
  prevProps: ReviewItemMemoProps,
  nextProps: ReviewItemMemoProps
) => {
  const prev = prevProps.review;
  const next = nextProps.review;

  return (
    prev.id === next.id &&
    prev.user_id === next.user_id &&
    prev.comment === next.comment &&
    prev.image_url === next.image_url &&
    prev.inserted_at === next.inserted_at &&
    prev.taste === next.taste &&
    prev.presentation === next.presentation &&
    prev._commentPatch === next._commentPatch &&
    prev.likes_count === next.likes_count &&
    prev.comments_count === next.comments_count &&
    prev.has_liked === next.has_liked &&
    JSON.stringify(recentCommentsKey(prev.recent_comments)) ===
      JSON.stringify(recentCommentsKey(next.recent_comments)) &&
    prev.location?.id === next.location?.id &&
    prev.location?.name === next.location?.name &&
    prev.location?.address === next.location?.address &&
    prev.location?.rating === next.location?.rating &&
    prev.location?.total_ratings === next.location?.total_ratings &&
    optionId(prev.spirit) === optionId(next.spirit) &&
    prev.spirit?.name === next.spirit?.name &&
    optionId(prev.type) === optionId(next.type) &&
    prev.type?.name === next.type?.name &&
    prev.profile?.id === next.profile?.id &&
    prev.profile?.username === next.profile?.username &&
    prev.profile?.avatar_url === next.profile?.avatar_url &&
    prev.profile?.is_verified === next.profile?.is_verified &&
    prev.profile?.review_count === next.profile?.review_count &&
    prevProps.canDelete === nextProps.canDelete &&
    prevProps.previewMode === nextProps.previewMode &&
    prevProps.onDelete === nextProps.onDelete &&
    prevProps.onEdit === nextProps.onEdit &&
    prevProps.onShowLikes === nextProps.onShowLikes &&
    prevProps.onShowComments === nextProps.onShowComments &&
    prevProps.onCommentAdded === nextProps.onCommentAdded &&
    prevProps.onCommentDeleted === nextProps.onCommentDeleted
  );
};
