import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";
import * as Haptics from "expo-haptics";
import { supabase } from "@/utils/supabase";
import { reportError } from "@/utils/log";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { useMembership } from "@/context/membership-context";
import { useReviewShareMenu } from "@/hooks/useReviewShareMenu";
import {
  buildReviewPreviewComments,
  type ReviewWithCommentPatch,
} from "@/utils/reviewEngagement";
import type { Comment, Profile } from "@/types/types";

const useLikes = (
  reviewId: string,
  userId: string | null,
  initialCount: number,
  initialHasLiked: boolean
) => {
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [likesCount, setLikesCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setHasLiked(initialHasLiked);
    setLikesCount(initialCount);
  }, [reviewId, initialHasLiked, initialCount]);

  const toggleLike = useCallback(async () => {
    if (!userId || loading) return;

    const wasLiked = hasLiked;
    setHasLiked(!wasLiked);
    setLikesCount((prev) => Math.max(0, prev + (wasLiked ? -1 : 1)));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    setLoading(true);
    try {
      const { error } = wasLiked
        ? await supabase
            .from("likes")
            .delete()
            .eq("review_id", reviewId)
            .eq("user_id", userId)
        : await supabase
            .from("likes")
            .upsert([{ review_id: reviewId, user_id: userId }]);

      if (error) throw error;
    } catch (error) {
      reportError("Error toggling like:", error);
      setHasLiked(wasLiked);
      setLikesCount((prev) => Math.max(0, prev + (wasLiked ? 1 : -1)));
    } finally {
      setLoading(false);
    }
  }, [reviewId, userId, hasLiked, loading]);

  return { hasLiked, likesCount, toggleLike };
};

interface ReviewEngagementOptions {
  review: ReviewWithCommentPatch;
  profile: Profile | null;
  onShowLikes: (reviewId: string) => void;
}

export function useReviewEngagement({
  review,
  profile,
  onShowLikes,
}: ReviewEngagementOptions) {
  const { requireMembership } = useMembership();
  const shareReview = useReviewShareMenu(review);
  const { hasLiked, likesCount, toggleLike } = useLikes(
    review.id,
    profile?.id || null,
    review.likes_count ?? 0,
    review.has_liked ?? false
  );
  const [commentLikeState, setCommentLikeState] = useState<{
    reviewId: string;
    overrides: Record<number, Pick<Comment, "has_liked" | "likes_count">>;
  }>({ reviewId: review.id, overrides: {} });
  const pendingCommentLikes = useRef(new Set<number>());

  const handleShare = useCallback(() => {
    if (requireMembership("share-review")) shareReview();
  }, [requireMembership, shareReview]);

  const handleShowLikes = useCallback(() => {
    if (requireMembership("social-list")) onShowLikes(review.id);
  }, [onShowLikes, requireMembership, review.id]);

  const commentCount = review.comments_count ?? 0;
  const commentLikeOverrides =
    commentLikeState.reviewId === review.id ? commentLikeState.overrides : {};
  const previewComments = buildReviewPreviewComments(
    review,
    commentLikeOverrides
  );

  const handleToggleCommentLike = useCallback(
    async (comment: Comment) => {
      if (!profile) {
        requireMembership("like-comment");
        return;
      }
      if (pendingCommentLikes.current.has(comment.id)) return;

      const wasLiked = Boolean(comment.has_liked);
      const previousCount = comment.likes_count ?? 0;
      const nextLiked = !wasLiked;
      pendingCommentLikes.current.add(comment.id);
      setCommentLikeState((current) => ({
        reviewId: review.id,
        overrides: {
          ...(current.reviewId === review.id ? current.overrides : {}),
          [comment.id]: {
            has_liked: nextLiked,
            likes_count: Math.max(0, previousCount + (nextLiked ? 1 : -1)),
          },
        },
      }));
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        await databaseService.setCommentLiked(
          comment.id,
          profile.id,
          nextLiked,
          review.id
        );
        if (nextLiked) {
          AnalyticService.capture("like_comment", {
            reviewId: review.id,
            commentId: comment.id,
            locationId: review.location?.id,
            locationName: review.location?.name,
          });
        }
      } catch (error) {
        setCommentLikeState((current) => ({
          reviewId: review.id,
          overrides: {
            ...(current.reviewId === review.id ? current.overrides : {}),
            [comment.id]: {
              has_liked: wasLiked,
              likes_count: previousCount,
            },
          },
        }));
        reportError("Error toggling preview comment like:", error);
      } finally {
        pendingCommentLikes.current.delete(comment.id);
      }
    },
    [
      profile,
      requireMembership,
      review.id,
      review.location?.id,
      review.location?.name,
    ]
  );

  const handleToggleLike = useCallback(async () => {
    if (!profile) {
      requireMembership("like-review");
      return;
    }

    const wasLiked = hasLiked;
    await toggleLike();
    if (!wasLiked) {
      AnalyticService.capture("like_review", {
        reviewId: review.id,
        locationId: review.location?.id,
        locationName: review.location?.name,
      });
    }
  }, [
    profile,
    requireMembership,
    hasLiked,
    toggleLike,
    review.id,
    review.location?.id,
    review.location?.name,
  ]);

  const handleReportSubmit = useCallback(
    async (reason: string, customReason?: string) => {
      if (!profile) return;

      try {
        await databaseService.reportReview(review.id, customReason || reason);
        AnalyticService.capture("report", {
          reviewId: review.id,
          reason: customReason || reason,
          targetUserId: review.profile?.id,
        });
        Alert.alert(
          "Report Submitted",
          "Thank you for your report. We will review it shortly."
        );
      } catch (error) {
        reportError("Error submitting report:", error);
        Alert.alert("Error", "Failed to submit report. Please try again.");
      }
    },
    [profile, review.id, review.profile?.id]
  );

  return {
    commentCount,
    handleReportSubmit,
    handleShare,
    handleShowLikes,
    handleToggleCommentLike,
    handleToggleLike,
    hasLiked,
    likesCount,
    previewComments,
  };
}
