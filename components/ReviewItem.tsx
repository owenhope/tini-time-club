import React, { useRef, useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  Alert,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { Link } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { supabase } from "@/utils/supabase";
import {
  Avatar,
  RatingPips,
  PIPS_MAX,
  VerifiedName,
} from "@/components/shared";
import ReviewTag from "@/components/shared/review-tag";
import { Comment, Review } from "@/types/types";
import * as Haptics from "expo-haptics";
import {
  formatCityRegion,
  formatRelativeDate,
  stripNameFromAddress,
} from "@/utils/helpers";
import { calculateOverallRating, formatRating } from "@/utils/ratingUtils";
import ReportModal from "@/components/ReportModal";
import ActionSheet from "@/components/ActionSheet";
import ReviewImageViewer from "@/components/ReviewImageViewer";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { HIT_SLOP, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { useReviewShareMenu } from "@/hooks/useReviewShareMenu";

/**
 * 16:11, the aspect the card is drawn at. A taller photo pushed the like /
 * comment / share row under the tab bar on a 6.1" — with the scores now
 * sitting below the image as well, the photo has to give that height back.
 * Uploads are stored uncropped and centre-crop here via `contentFit="cover"`.
 */
const DOUBLE_TAP_DELAY = 300;
const REVIEW_AUTHOR_AVATAR_SIZE = 34;
const COMMENT_PREVIEW_COLLAPSED_LINES = 2;
const MAX_PREVIEW_COMMENTS = 1;
const ICON_SIZES = {
  small: 20,
  medium: 24,
} as const;

const InlineIdentityText = ({
  username,
  isVerified,
  body,
  usernameStyle,
  bodyStyle,
  numberOfLines,
  onTextLayout,
  onUsernamePress,
}: {
  username: string;
  isVerified?: boolean | null;
  body: string;
  usernameStyle: StyleProp<TextStyle>;
  bodyStyle?: StyleProp<TextStyle>;
  numberOfLines?: number;
  onTextLayout?: React.ComponentProps<typeof Text>["onTextLayout"];
  /** Omit for the viewer's own name, which has nowhere to navigate to. */
  onUsernamePress?: () => void;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <Text
      style={[styles.inlineBody, bodyStyle]}
      numberOfLines={numberOfLines}
      onTextLayout={onTextLayout}
    >
      <Text
        style={usernameStyle}
        onPress={onUsernamePress}
        suppressHighlighting={!onUsernamePress}
        accessibilityRole={onUsernamePress ? "link" : undefined}
        accessibilityLabel={
          onUsernamePress ? `View ${username}'s profile` : undefined
        }
      >
        {username}
      </Text>
      {isVerified ? (
        <MaterialIcons name="verified" size={13} color={colors.accent} />
      ) : null}
      <Text> {body}</Text>
    </Text>
  );
};

interface ReviewItemProps {
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
  /** The composer's live preview: no header, no actions, no interaction. */
  previewMode?: boolean;
}

/**
 * Likes state for one review.
 *
 * The counts arrive with the feed row (see the feed_reviews DB function), so
 * this no longer issues its own count + membership queries per rendered item —
 * that was two extra round trips per row, ~40 per page.
 */
const useLikes = (
  reviewId: string,
  userId: string | null,
  initialCount: number,
  initialHasLiked: boolean
) => {
  const [hasLiked, setHasLiked] = useState(initialHasLiked);
  const [likesCount, setLikesCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  // Re-sync when the row is refreshed or recycled onto a different review.
  useEffect(() => {
    setHasLiked(initialHasLiked);
    setLikesCount(initialCount);
  }, [reviewId, initialHasLiked, initialCount]);

  const toggleLike = useCallback(async () => {
    if (!userId || loading) return;

    const wasLiked = hasLiked;

    // Update optimistically so the heart responds immediately, then roll back
    // if the write fails. supabase-js resolves with { error } rather than
    // throwing, so the error must be inspected explicitly.
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

  return { hasLiked, likesCount, toggleLike, loading };
};

// Custom hook for comments management - lazy loaded
const useComments = (reviewId: string, lazyLoad: boolean = true) => {
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchComments = useCallback(async () => {
    if (hasLoaded) return; // Don't refetch if already loaded
    try {
      setLoading(true);
      const data = await databaseService.getComments(reviewId);
      setComments(data || []);
      setHasLoaded(true);
    } catch (error) {
      reportError("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [reviewId, hasLoaded]);

  const addComment = useCallback((newComment: any) => {
    // Idempotent: the parent's _commentPatch is re-applied whenever a
    // recycled row remounts, so the same comment can arrive more than once.
    setComments((prev) =>
      prev.some((c) => c.id === newComment.id) ? prev : [...prev, newComment]
    );
  }, []);

  const removeComment = useCallback((commentId: number) => {
    setComments((prev) => prev.filter((c) => c.id !== commentId));
  }, []);

  // Only fetch comments if not lazy loading, or if explicitly requested
  useEffect(() => {
    if (!lazyLoad && !hasLoaded) {
      fetchComments();
    }
  }, [lazyLoad, hasLoaded, fetchComments]);

  return {
    comments,
    loading,
    addComment,
    removeComment,
    fetchComments,
    hasLoaded,
  };
};

// Reusable UI Components
const AvatarWrapper = memo(
  ({
    avatarUrl,
    username,
    isVerified,
    authorId,
    reviewCount,
  }: {
    avatarUrl: string | null;
    username?: string;
    isVerified?: boolean;
    authorId?: string | null;
    reviewCount?: number | null;
  }) => {
    const openProfile = useOpenProfile();
    const styles = useStyles();

    const handlePress = useCallback(
      () => openProfile(username, authorId),
      [openProfile, username, authorId]
    );

    const content = (
      <View style={styles.headerProfile}>
        <Avatar
          avatarPath={avatarUrl}
          username={username}
          size={REVIEW_AUTHOR_AVATAR_SIZE}
          reviewCount={reviewCount}
        />
        <View style={styles.headerIdentity}>
          <VerifiedName
            name={username || "Unknown"}
            isVerified={isVerified}
            textStyle={styles.headerUsername}
          />
          <Text style={styles.headerMeta}>
            {reviewCount === 1 ? "1 review" : `${reviewCount ?? 0} reviews`}
          </Text>
        </View>
      </View>
    );

    return (
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={styles.headerProfileTap}
      >
        {content}
      </TouchableOpacity>
    );
  }
);
AvatarWrapper.displayName = "AvatarWrapper";

const LikeButton = memo(
  ({
    hasLiked,
    onPress,
    disabled = false,
  }: {
    hasLiked: boolean;
    onPress: () => void;
    disabled?: boolean;
  }) => {
    const { colors } = useTheme();

    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={
          hasLiked ? "Unlike this review" : "Like this review"
        }
        accessibilityState={{ selected: hasLiked, disabled }}
        hitSlop={HIT_SLOP}
      >
        <Ionicons
          name={hasLiked ? "heart" : "heart-outline"}
          size={ICON_SIZES.medium}
          color={hasLiked ? colors.like : colors.postText}
        />
      </TouchableOpacity>
    );
  }
);
LikeButton.displayName = "LikeButton";

const CommentButton = memo(
  ({ count }: { onPress: () => void; count: number }) => {
    const { colors } = useTheme();

    return (
      <Ionicons
        name="chatbubble-outline"
        size={ICON_SIZES.medium}
        color={colors.postText}
        accessibilityLabel={count === 1 ? "1 comment" : `${count} comments`}
      />
    );
  }
);
CommentButton.displayName = "CommentButton";

const ShareButton = memo(({ onPress }: { onPress: () => void }) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Share this review"
      hitSlop={HIT_SLOP}
    >
      <Ionicons
        name="paper-plane-outline"
        size={ICON_SIZES.medium}
        color={colors.postText}
      />
    </TouchableOpacity>
  );
});
ShareButton.displayName = "ShareButton";

/**
 * What sits *on* the photo: the venue on a scrimStrong plate bottom-left, the
 * spirit and type as pills bottom-right. Nothing else \u2014 the scores moved off
 * the image and onto the card below it, where their contrast is a constant
 * rather than a property of the picture.
 */
const PhotoChips = memo(({ review }: { review: Review }) => {
  const styles = useStyles();
  // Where in the world it was poured — a venue name alone means nothing to
  // anyone who doesn't already drink there.
  const cityCountry = review.location?.address
    ? formatCityRegion(
        stripNameFromAddress(review.location.name, review.location.address)
      )
    : null;

  const venueCount = review.location?.total_ratings ?? 0;
  const venueRating =
    review.location?.rating != null && venueCount > 0
      ? Number(review.location.rating)
      : null;
  const venueReviewLabel =
    venueCount === 1 ? "1 review" : `${venueCount} reviews`;

  return (
    <>
      <View style={styles.photoPills}>
        {review.spirit?.name ? (
          <ReviewTag name={review.spirit.name} fallback="spirit" />
        ) : null}
        {review.type?.name ? (
          <ReviewTag name={review.type.name} fallback="type" />
        ) : null}
      </View>

      <View style={styles.photoFooter}>
        <Link href={`/places/${review.location?.id}`} asChild>
          <TouchableOpacity
            style={styles.venueChip}
            activeOpacity={0.8}
            accessibilityLabel={
              venueRating != null
                ? `${review.location?.name || "Place"}, ${formatRating(
                    venueRating
                  )} from ${venueReviewLabel}`
                : review.location?.name || "Place"
            }
          >
            <View style={styles.venueChipLines}>
              <Text style={styles.venueChipText} numberOfLines={1}>
                {review.location?.name || "N/A"}
              </Text>
              {cityCountry ? (
                <Text style={styles.venueChipMeta} numberOfLines={1}>
                  {cityCountry}
                </Text>
              ) : null}
              {venueRating != null ? (
                <View style={styles.venueChipRating}>
                  <RatingPips
                    value={1}
                    max={1}
                    size={13}
                    accessibilityLabel=""
                  />
                  <Text style={styles.venueChipRatingText} numberOfLines={1}>
                    {formatRating(venueRating)} · {venueReviewLabel}
                  </Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        </Link>
      </View>
    </>
  );
});
PhotoChips.displayName = "PhotoChips";

/**
 * The two axes as olives \u2014 the brand's own scale \u2014 with the blended TTC score
 * beside them. A review is two scores, so the card shows two, and the derived
 * number never replaces them.
 */
const ReviewScores = memo(({ review }: { review: Review }) => {
  const styles = useStyles();
  const overall = calculateOverallRating(review.taste, review.presentation);

  return (
    <View
      style={styles.scores}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`Taste ${review.taste} out of ${PIPS_MAX}. Presentation ${review.presentation} out of ${PIPS_MAX}. Overall ${formatRating(overall)}.`}
    >
      <View style={styles.scoreAxis}>
        <Text style={styles.scoreLabel}>Taste</Text>
        <RatingPips value={review.taste ?? 0} size={15} accessibilityLabel="" />
      </View>
      <View style={styles.scoreAxis}>
        <Text style={styles.scoreLabel}>Presentation</Text>
        <RatingPips
          value={review.presentation ?? 0}
          size={15}
          accessibilityLabel=""
        />
      </View>
      <View style={styles.scoreOverall}>
        <Text style={styles.scoreLabel}>Overall</Text>
        <Text style={styles.scoreOverallValue}>{formatRating(overall)}</Text>
      </View>
    </View>
  );
});
ReviewScores.displayName = "ReviewScores";

const CommentPreviewItem = memo(
  ({
    comment,
    onShowComments,
    onToggleLike,
  }: {
    comment: Comment;
    onShowComments: () => void;
    onToggleLike: (comment: Comment) => void;
  }) => {
    const styles = useStyles();
    const { colors } = useTheme();
    const openProfile = useOpenProfile();
    const [expanded, setExpanded] = useState(false);
    const [canExpand, setCanExpand] = useState(false);
    const likesCount = comment.likes_count ?? 0;
    const hasLiked = Boolean(comment.has_liked);

    const handleTextLayout = useCallback<
      NonNullable<React.ComponentProps<typeof Text>["onTextLayout"]>
    >(
      (event) => {
        if (!expanded) {
          setCanExpand(
            event.nativeEvent.lines.length > COMMENT_PREVIEW_COLLAPSED_LINES
          );
        }
      },
      [expanded]
    );

    const handleExpand = useCallback(() => {
      setExpanded(true);
    }, []);

    return (
      <View style={styles.commentItem}>
        <View style={styles.commentPreviewBody}>
          <TouchableOpacity
            onPress={onShowComments}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`Open comments from ${comment.profile?.username || "Unknown"}`}
          >
            <InlineIdentityText
              username={comment.profile?.username || "Unknown"}
              isVerified={comment.profile?.is_verified}
              body={comment.body}
              usernameStyle={styles.captionUsername}
              bodyStyle={styles.captionText}
              numberOfLines={
                expanded ? undefined : COMMENT_PREVIEW_COLLAPSED_LINES
              }
              onTextLayout={handleTextLayout}
              onUsernamePress={() =>
                openProfile(comment.profile?.username, comment.profile?.id)
              }
            />
          </TouchableOpacity>
          {!expanded && canExpand ? (
            <TouchableOpacity
              onPress={handleExpand}
              activeOpacity={0.7}
              hitSlop={HIT_SLOP}
              style={styles.commentMoreButton}
              accessibilityRole="button"
              accessibilityLabel="Show full comment"
            >
              <Text style={styles.commentMoreText}>More</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity
          style={styles.commentLikeButton}
          onPress={() => onToggleLike(comment)}
          accessibilityRole="button"
          accessibilityLabel={`${hasLiked ? "Unlike" : "Like"} comment by ${comment.profile?.username || "Unknown"}`}
          accessibilityState={{ selected: hasLiked }}
          hitSlop={HIT_SLOP}
        >
          <Ionicons
            name={hasLiked ? "heart" : "heart-outline"}
            size={18}
            color={hasLiked ? colors.like : colors.textMuted}
          />
          {likesCount > 0 ? (
            <Text
              style={[
                styles.commentLikeCount,
                hasLiked && styles.commentLikeCountActive,
              ]}
            >
              {likesCount}
            </Text>
          ) : null}
        </TouchableOpacity>
      </View>
    );
  }
);
CommentPreviewItem.displayName = "CommentPreviewItem";

const ReviewFooter = memo(
  ({
    review,
    hasLiked,
    likesCount,
    commentCount,
    previewComments,
    onToggleCommentLike,
    onToggleLike,
    onShowLikes,
    onShowComments,
    onShare,
    onCommentAdded,
    onCommentDeleted,
    onEdit,
    isOwnReview,
    loadCommentsIfNeeded,
  }: {
    review: Review;
    hasLiked: boolean;
    likesCount: number;
    commentCount: number;
    previewComments: Comment[];
    onToggleCommentLike: (comment: Comment) => void;
    onToggleLike: () => void;
    onShowLikes: (reviewId: string) => void;
    onShowComments: (
      reviewId: string,
      onCommentAdded: any,
      onCommentDeleted: any
    ) => void;
    onShare: () => void;
    onCommentAdded: (reviewId: string, newComment: any) => void;
    onCommentDeleted: (reviewId: string, commentId: number) => void;
    onEdit?: () => void;
    isOwnReview: boolean;
    loadCommentsIfNeeded: () => void;
  }) => {
    const styles = useStyles();

    // Shared route: resolves inside whichever tab stack is rendering.
    const openProfile = useOpenProfile();

    const handleShowComments = useCallback(() => {
      loadCommentsIfNeeded(); // Ensure comments are loaded before showing
      onShowComments(review.id, onCommentAdded, onCommentDeleted);
    }, [
      review.id,
      onShowComments,
      onCommentAdded,
      onCommentDeleted,
      loadCommentsIfNeeded,
    ]);

    const handleShowLikes = useCallback(() => {
      onShowLikes(review.id);
    }, [review.id, onShowLikes]);

    const hasCaption = review.comment && review.comment.trim().length > 0;

    return (
      <View style={styles.footer}>
        {/* Engagement belongs directly under the score summary, before the
            reading matter. */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            onPress={handleShowLikes}
            onLongPress={onToggleLike}
            style={styles.action}
            activeOpacity={0.7}
          >
            <LikeButton hasLiked={hasLiked} onPress={onToggleLike} />
            <Text style={[styles.actionCount, hasLiked && styles.actionLiked]}>
              {likesCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShowComments}
            style={styles.action}
            activeOpacity={0.7}
          >
            <CommentButton onPress={handleShowComments} count={commentCount} />
            <Text style={styles.actionCount}>{commentCount}</Text>
          </TouchableOpacity>
          <View style={styles.actionSpacer} />
          <ShareButton onPress={onShare} />
        </View>

        {(hasCaption || (isOwnReview && onEdit)) && (
          <View style={styles.captionSection}>
            {hasCaption ? (
              <InlineIdentityText
                username={review.profile?.username || "Unknown"}
                isVerified={review.profile?.is_verified}
                body={review.comment}
                usernameStyle={styles.captionUsername}
                bodyStyle={styles.captionText}
                onUsernamePress={() =>
                  openProfile(review.profile?.username, review.profile?.id)
                }
              />
            ) : (
              <TouchableOpacity onPress={onEdit}>
                <Text style={styles.addCaptionText}>Add a caption</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Comment previews: from the feed row, or the full list once loaded */}
        {previewComments.length > 0 && (
          <>
            {previewComments.map((c) => (
              <CommentPreviewItem
                key={c.id}
                comment={c}
                onShowComments={handleShowComments}
                onToggleLike={onToggleCommentLike}
              />
            ))}

            {commentCount > MAX_PREVIEW_COMMENTS && (
              <TouchableOpacity onPress={handleShowComments}>
                <Text style={styles.viewAllCommentsText}>
                  view more comments
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {review.inserted_at ? (
          <Text style={styles.footerTimestamp}>
            {formatRelativeDate(review.inserted_at)}
          </Text>
        ) : null}
      </View>
    );
  }
);
ReviewFooter.displayName = "ReviewFooter";

const getRecentCommentsKey = (review: Review) =>
  (review.recent_comments ?? [])
    .map(
      (comment) =>
        `${comment.id}:${comment.likes_count ?? 0}:${Boolean(comment.has_liked)}`
    )
    .join("|");

// Comparison function for memo to prevent unnecessary re-renders
const areEqual = (prevProps: ReviewItemProps, nextProps: ReviewItemProps) => {
  // Only re-render if review data actually changed
  const prev = prevProps.review as any;
  const next = nextProps.review as any;

  return (
    prevProps.review.id === nextProps.review.id &&
    prevProps.review.comment === nextProps.review.comment &&
    prevProps.review.image_url === nextProps.review.image_url &&
    prevProps.review.taste === nextProps.review.taste &&
    prevProps.review.presentation === nextProps.review.presentation &&
    prevProps.review._commentPatch === nextProps.review._commentPatch &&
    // Aggregates now arrive with the row; without these a refreshed feed
    // would keep rendering stale like/comment counts.
    prev.likes_count === next.likes_count &&
    prev.comments_count === next.comments_count &&
    prev.has_liked === next.has_liked &&
    getRecentCommentsKey(prevProps.review) ===
      getRecentCommentsKey(nextProps.review) &&
    prev.location?.rating === next.location?.rating &&
    prev.location?.total_ratings === next.location?.total_ratings &&
    prev.profile?.is_verified === next.profile?.is_verified &&
    prevProps.canDelete === nextProps.canDelete &&
    prevProps.previewMode === nextProps.previewMode
  );
};

const ReviewItemComponent = ({
  review,
  canDelete,
  onDelete,
  onEdit,
  onShowLikes,
  onShowComments,
  onCommentAdded,
  onCommentDeleted,
  previewMode = false,
}: ReviewItemProps) => {
  const { profile } = useProfile();
  const styles = useStyles();
  const { colors } = useTheme();
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [commentLikeState, setCommentLikeState] = useState<{
    reviewId: string;
    overrides: Record<number, Pick<Comment, "has_liked" | "likes_count">>;
  }>({ reviewId: review.id, overrides: {} });
  const lastTapRef = useRef<number>(0);
  const pendingCommentLikes = useRef(new Set<number>());
  const isOwnReview = String(profile?.id) === String(review.profile?.id);
  const handleShare = useReviewShareMenu(review);

  // Use custom hooks for data management
  const { hasLiked, likesCount, toggleLike } = useLikes(
    review.id,
    profile?.id || null,
    review.likes_count ?? 0,
    review.has_liked ?? false
  );

  const { comments, addComment, removeComment, fetchComments, hasLoaded } =
    useComments(review.id, true);

  // Comment bodies are only needed once the user actually looks at them. The
  // count shown in the footer comes with the feed row, so the previous
  // fetch-on-mount (one query per rendered item) is gone.
  const serverCommentCount = review.comments_count ?? 0;
  const commentCount = hasLoaded ? comments.length : serverCommentCount;

  // Preview comments ride along with the feed row; once the full list has been
  // fetched (user opened the sheet) prefer that.
  const commentLikeOverrides =
    commentLikeState.reviewId === review.id ? commentLikeState.overrides : {};
  const previewComments = (
    hasLoaded
      ? comments.slice(-2)
      : [...(review.recent_comments ?? [])]
          .slice(0, MAX_PREVIEW_COMMENTS)
          .reverse()
  ).map((comment) => ({
    ...comment,
    ...commentLikeOverrides[comment.id],
  }));

  const handleToggleCommentLike = useCallback(
    async (comment: Comment) => {
      if (!profile || pendingCommentLikes.current.has(comment.id)) return;

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
    [profile, review.id, review.location?.id, review.location?.name]
  );

  const loadCommentsIfNeeded = useCallback(() => {
    if (!hasLoaded) fetchComments();
  }, [hasLoaded, fetchComments]);

  // Handle comment patches
  useEffect(() => {
    if (review._commentPatch) {
      if (review._commentPatch.action === "add") {
        addComment(review._commentPatch.data);
      } else if (review._commentPatch.action === "delete") {
        removeComment(review._commentPatch.id);
      }
    }
  }, [review._commentPatch, addComment, removeComment]);

  // Like mutations generate their notification from a database trigger.
  const handleToggleLike = useCallback(async () => {
    if (!profile) return;

    const wasLiked = hasLiked;
    await toggleLike();

    // Track like event (only when liking, not unliking)
    if (!wasLiked) {
      AnalyticService.capture("like_review", {
        reviewId: review.id,
        locationId: review.location?.id,
        locationName: review.location?.name,
      });
    }
  }, [
    profile,
    hasLiked,
    toggleLike,
    review.id,
    review.location?.id,
    review.location?.name,
  ]);

  const handleImagePress = useCallback(() => {
    const now = Date.now();
    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      lastTapRef.current = 0;
      if (!hasLiked) void handleToggleLike();
      return;
    }
    lastTapRef.current = now;
  }, [handleToggleLike, hasLiked]);

  const handleReportSubmit = useCallback(
    async (reason: string, customReason?: string) => {
      if (!profile) return;

      try {
        // Through the service, like every other write.
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

  if (previewMode) {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.imageContainer} testID="review-photo">
          <ExpoImage
            source={{ uri: review.image_url }}
            style={styles.reviewImage}
            contentFit="cover"
            transition={200}
            placeholderContentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={review.id}
          />
          <PhotoChips review={review} />
        </View>

        <ReviewScores review={review} />

        <ReviewFooter
          review={review}
          hasLiked={false}
          likesCount={0}
          commentCount={0}
          previewComments={[]}
          onToggleCommentLike={() => {}}
          onToggleLike={() => {}}
          onShowLikes={() => {}}
          onShowComments={() => {}}
          onShare={() => {}}
          onCommentAdded={() => {}}
          onCommentDeleted={() => {}}
          onEdit={undefined}
          isOwnReview={false}
          loadCommentsIfNeeded={() => {}}
        />
      </View>
    );
  }

  return (
    <>
      <View style={styles.card}>
        {
          <View style={styles.header}>
            <AvatarWrapper
              avatarUrl={review.profile?.avatar_url || null}
              username={review.profile?.username}
              isVerified={review.profile?.is_verified}
              authorId={review.profile?.id}
              reviewCount={review.profile?.review_count}
            />
            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={() => setActionSheetVisible(true)}
                style={styles.actionButton}
                accessibilityRole="button"
                accessibilityLabel="More options for this review"
                hitSlop={HIT_SLOP}
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={ICON_SIZES.small}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>
        }

        <Pressable
          style={styles.imageContainer}
          onPress={handleImagePress}
          accessible={false}
          testID="review-photo"
        >
          <ExpoImage
            source={{ uri: review.image_url }}
            style={styles.reviewImage}
            contentFit="cover"
            transition={200}
            placeholderContentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={review.id}
          />
          <TouchableOpacity
            style={styles.imageViewerButton}
            onPress={() => setImageViewerVisible(true)}
            activeOpacity={0.75}
            accessibilityRole="button"
            accessibilityLabel="View review photo"
            hitSlop={HIT_SLOP}
          >
            <Ionicons
              name="eye-outline"
              size={ICON_SIZES.small}
              color={colors.textOnImage}
            />
          </TouchableOpacity>
          <PhotoChips review={review} />
        </Pressable>

        <ReviewScores review={review} />

        {
          <ReviewFooter
            review={review}
            hasLiked={hasLiked}
            likesCount={likesCount}
            commentCount={commentCount}
            previewComments={previewComments}
            onToggleCommentLike={(comment) =>
              void handleToggleCommentLike(comment)
            }
            onToggleLike={handleToggleLike}
            onShowLikes={onShowLikes}
            onShowComments={onShowComments}
            onShare={handleShare}
            onCommentAdded={onCommentAdded}
            onCommentDeleted={onCommentDeleted}
            onEdit={onEdit}
            isOwnReview={isOwnReview}
            loadCommentsIfNeeded={loadCommentsIfNeeded}
          />
        }
      </View>

      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        onDelete={onDelete}
        onEdit={onEdit}
        onShare={handleShare}
        onReport={() => setReportModalVisible(true)}
        isOwnReview={isOwnReview}
      />

      <ReportModal
        visible={reportModalVisible}
        title="Report Review"
        onClose={() => setReportModalVisible(false)}
        onSelect={handleReportSubmit}
      />

      <ReviewImageViewer
        visible={imageViewerVisible}
        imageUrl={review.image_url}
        onClose={() => setImageViewerVisible(false)}
      />
    </>
  );
};

const ReviewItem = memo(ReviewItemComponent, areEqual);

export default ReviewItem;

const useStyles = makeStyles((t) => ({
  /**
   * A review is a card on paper, not a full-bleed block: hairline edge, low
   * green-tinted shadow, clipped to the card radius so the photo's corners
   * follow it.
   */
  card: {
    marginHorizontal: t.spacing.gutter,
    marginBottom: t.spacing.lg,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    overflow: "hidden" as const,
    ...t.elevation.card,
  },
  header: {
    paddingLeft: t.spacing.md,
    paddingRight: t.spacing.sm,
    paddingVertical: t.spacing.sm,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
    backgroundColor: t.colors.surface,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs,
  },
  actionButton: {
    padding: t.spacing.xs,
  },
  headerUsername: {
    ...t.typography.bodyStrong,
    color: t.colors.usernameText,
  },
  headerMeta: {
    ...t.typography.label,
    color: t.colors.textMuted,
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 0,
  },
  headerProfileTap: {
    flex: 1,
    minWidth: 0,
  },
  headerProfile: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    // Gap on the row, not margin on the avatar: the ranking ring wraps the
    // avatar and would swallow an inner margin.
    gap: t.spacing.sm,
  },
  imageContainer: {
    width: "100%" as const,
    aspectRatio: 16 / 11,
    position: "relative" as const,
  },
  reviewImage: {
    width: "100%" as const,
    height: "100%" as const,
    backgroundColor: t.colors.imagePlaceholder,
  },
  imageViewerButton: {
    position: "absolute" as const,
    top: t.spacing.md,
    left: t.spacing.md,
    width: 36,
    height: 36,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.scrimStrong,
  },
  // The only things left on the photo: where it was, how the place is doing,
  // and what was in it. The venue score stays inside the venue chip so it
  // reads as place context instead of another review score.
  photoFooter: {
    position: "absolute" as const,
    left: t.spacing.md,
    right: t.spacing.md,
    bottom: t.spacing.md,
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.sm,
  },
  venueChip: {
    maxWidth: "100%" as const,
    flexShrink: 1,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: 7,
    paddingLeft: t.spacing.md,
    paddingRight: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.scrimStrong,
  },
  venueChipLines: {
    flexShrink: 1,
    minWidth: 0,
    gap: 2,
  },
  venueChipText: {
    ...t.typography.bodyStrong,
    letterSpacing: 0,
    color: t.colors.textOnImage,
    flexShrink: 1,
  },
  venueChipRating: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    minWidth: 0,
  },
  venueChipRatingText: {
    ...t.typography.mono,
    color: t.colors.textOnImage,
    flexShrink: 1,
  },
  venueChipMeta: {
    ...t.typography.mono,
    color: t.colors.textOnImage,
    flexShrink: 1,
  },
  photoPills: {
    position: "absolute" as const,
    top: t.spacing.md,
    right: t.spacing.md,
    flexShrink: 0,
    flexDirection: "row" as const,
    gap: 6,
  },
  // A review is two scores. They read as olives — the brand's own scale —
  // with the blended TTC number beside them, never instead of them.
  scores: {
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    gap: t.spacing.xl,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg - 2,
    backgroundColor: t.colors.surface,
  },
  scoreAxis: {
    alignItems: "flex-start" as const,
    gap: 7,
  },
  scoreLabel: {
    ...t.typography.eyebrow,
    color: t.colors.textMuted,
  },
  scoreOverall: {
    flex: 1,
    alignItems: "flex-end" as const,
    gap: 3,
  },
  scoreOverallValue: {
    ...t.typography.display,
    // The score belongs to the olives beside it, so it takes their green
    // rather than the primary purple. In dark mode that green is a fill token,
    // not readable text, so the score takes the paper ink used by other key
    // dark-mode numbers.
    color: t.isDark ? t.colors.textSecondary : t.colors.secondary,
    fontVariant: ["tabular-nums"] as const,
  },
  footer: {
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.sm,
  },
  // The metrics sit directly under the rating summary, with the comment
  // previews below.
  actionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.lg + 2,
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
    paddingTop: t.spacing.md - 1,
    paddingBottom: t.spacing.md + 1,
    marginBottom: t.spacing.md - 1,
  },
  action: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    minHeight: 28,
  },
  actionSpacer: {
    flex: 1,
  },
  actionCount: {
    ...t.typography.bodyStrong,
    color: t.colors.postText,
    fontVariant: ["tabular-nums"] as const,
  },
  actionLiked: {
    color: t.colors.like,
  },
  captionSection: {
    marginBottom: t.spacing.xs,
  },
  captionText: {
    ...t.typography.body,
    color: t.colors.postText,
  },
  inlineBody: {
    ...t.typography.body,
    color: t.colors.postText,
    flexShrink: 1,
  },
  captionUsername: {
    ...t.typography.bodyStrong,
    color: t.colors.usernameText,
  },
  captionBody: {
    ...t.typography.body,
    color: t.colors.postText,
  },
  addCaptionText: {
    ...t.typography.bodyStrong,
    color: t.colors.textSecondary,
  },
  commentItem: {
    width: "100%" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: 4,
  },
  commentPreviewBody: {
    flex: 1,
    minWidth: 0,
    paddingRight: t.spacing.xs,
  },
  commentLikeButton: {
    minHeight: 34,
    flexShrink: 0,
    flexDirection: "column" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
    gap: 1,
  },
  commentMoreButton: {
    alignSelf: "flex-start" as const,
    paddingTop: 1,
  },
  commentMoreText: {
    ...t.typography.bodyStrong,
    color: t.colors.textMuted,
  },
  commentLikeCount: {
    ...t.typography.label,
    textAlign: "center" as const,
    color: t.colors.textMuted,
  },
  commentLikeCountActive: { color: t.colors.like },
  timestamp: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  viewAllCommentsText: {
    ...t.typography.body,
    color: t.colors.textMuted,
    marginBottom: t.spacing.xs,
  },
  footerTimestamp: {
    ...t.typography.mono,
    color: t.colors.textMuted,
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.md,
  },
  // The composer's preview must look like what actually lands in the feed:
  // same card, same edge, same clipped corners.
  previewContainer: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: "hidden" as const,
    ...t.elevation.card,
  },
}));
