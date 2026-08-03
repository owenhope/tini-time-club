import React, { useRef, useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Alert,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { supabase } from "@/utils/supabase";
import {
  Avatar,
  Badge,
  RatingPips,
  PIPS_MAX,
  VerifiedName,
} from "@/components/shared";
import { Review } from "@/types/types";
import * as Haptics from "expo-haptics";
import {
  formatCityRegion,
  formatRelativeDate,
  stripNameFromAddress,
} from "@/utils/helpers";
import { getRankTier } from "@/utils/ranking";
import { calculateOverallRating, formatRating } from "@/utils/ratingUtils";
import ReportModal from "@/components/ReportModal";
import ActionSheet from "@/components/ActionSheet";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { HIT_SLOP, fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import { shareReviewViaSheet } from "@/utils/reviewShare";

// Constants
const SCREEN_WIDTH = Dimensions.get("window").width;
/**
 * The card is inset by the 20px screen gutter on both sides, so its photo is
 * narrower than the screen — it is no longer the full-bleed image the feed
 * used to run edge to edge.
 */
const CARD_WIDTH = SCREEN_WIDTH - 20 * 2;
/**
 * 16:11, the aspect the card is drawn at. A taller photo pushed the like /
 * comment / share row under the tab bar on a 6.1" — with the scores now
 * sitting below the image as well, the photo has to give that height back.
 * Uploads are stored uncropped and centre-crop here via `contentFit="cover"`.
 */
const PHOTO_HEIGHT = Math.round((CARD_WIDTH * 11) / 16);
const DOUBLE_TAP_DELAY = 300;

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
  onUsernamePress,
}: {
  username: string;
  isVerified?: boolean | null;
  body: string;
  usernameStyle: StyleProp<TextStyle>;
  bodyStyle?: StyleProp<TextStyle>;
  /** Omit for the viewer's own name, which has nowhere to navigate to. */
  onUsernamePress?: () => void;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <Text style={[styles.inlineBody, bodyStyle]}>
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
        <MaterialIcons name="verified" size={13} color={colors.secondary} />
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
  hideHeader?: boolean;
  hideFooter?: boolean;
  previewMode?: boolean;
  isVisible?: boolean;
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
    isOwnReview,
    reviewCount,
    postedAt,
  }: {
    avatarUrl: string | null;
    username?: string;
    isVerified?: boolean;
    isOwnReview: boolean;
    reviewCount?: number | null;
    postedAt?: string | null;
  }) => {
    const router = useRouter();
    const styles = useStyles();

    const handlePress = useCallback(() => {
      if (!isOwnReview && username) {
        // Shared route: resolves inside whichever tab stack is rendering.
        router.push(routes.user(username));
      }
    }, [isOwnReview, username, router]);

    const content = (
      <View style={styles.headerProfile}>
        <Avatar
          avatarPath={avatarUrl}
          username={username}
          size={46}
          reviewCount={reviewCount}
        />
        <View style={styles.headerIdentity}>
          <VerifiedName
            name={username || "Unknown"}
            isVerified={isVerified}
            textStyle={styles.headerUsername}
          />
          {/* Timestamps are data, so they set in mono — and they belong up
              here beside the poster, not orphaned under the comments. */}
          {postedAt ? (
            <Text style={styles.headerTimestamp}>
              {formatRelativeDate(postedAt)}
            </Text>
          ) : null}
        </View>
      </View>
    );

    if (isOwnReview) {
      return content;
    }

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
          color={hasLiked ? colors.like : colors.text}
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
        color={colors.text}
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
        color={colors.text}
      />
    </TouchableOpacity>
  );
});
ShareButton.displayName = "ShareButton";

const CommentCount = memo(({ count }: { count: number }) => {
  const styles = useStyles();
  return <Text style={styles.likesCount}>{count}</Text>;
});

/**
 * What sits *on* the photo: the venue on a scrimStrong plate bottom-left, the
 * spirit and type as pills bottom-right. Nothing else \u2014 the scores moved off
 * the image and onto the card below it, where their contrast is a constant
 * rather than a property of the picture.
 */
const PhotoChips = memo(({ review }: { review: Review }) => {
  const styles = useStyles();
  const { colors } = useTheme();
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

  return (
    <>
      {/* How the place is doing overall, kept apart from this review's own
          two scores below the photo so the two aren't read as one. */}
      {venueRating != null ? (
        <View
          style={styles.venueScore}
          accessible
          accessibilityLabel={`This place scores ${formatRating(
            venueRating
          )} from ${venueCount} ${venueCount === 1 ? "review" : "reviews"}`}
        >
          <RatingPips
            value={1}
            max={1}
            size={11}
            bodyColor={colors.accentOnImage}
            accessibilityLabel=""
          />
          <Text style={styles.venueScoreText}>
            {formatRating(venueRating)} · {venueCount}
          </Text>
        </View>
      ) : null}

      <View style={styles.photoFooter}>
        <Link href={`/places/${review.location?.id}`} asChild>
          <TouchableOpacity style={styles.venueChip} activeOpacity={0.8}>
            <Ionicons name="location" size={15} color={colors.accentOnImage} />
            <View style={styles.venueChipLines}>
              <Text style={styles.venueChipText} numberOfLines={1}>
                {review.location?.name || "N/A"}
              </Text>
              {cityCountry ? (
                <Text style={styles.venueChipMeta} numberOfLines={1}>
                  {cityCountry}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        </Link>

        <View style={styles.photoPills}>
          {review.spirit?.name ? (
            <View style={[styles.photoPill, styles.photoPillLoud]}>
              <Text style={[styles.photoPillText, styles.photoPillLoudText]}>
                {review.spirit.name}
              </Text>
            </View>
          ) : null}
          {review.type?.name ? (
            <View style={styles.photoPill}>
              <Text style={styles.photoPillText}>{review.type.name}</Text>
            </View>
          ) : null}
        </View>
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
        <Text style={styles.scoreOverallValue}>{formatRating(overall)}</Text>
        <Text style={styles.scoreLabel}>Overall</Text>
      </View>
    </View>
  );
});
ReviewScores.displayName = "ReviewScores";
CommentCount.displayName = "CommentCount";

const ReviewFooter = memo(
  ({
    review,
    hasLiked,
    likesCount,
    comments,
    hasLoaded,
    commentCount,
    previewComments,
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
    comments: any[];
    hasLoaded: boolean;
    commentCount: number;
    previewComments: any[];
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
    const router = useRouter();

    // Shared route: resolves inside whichever tab stack is rendering.
    const openProfile = useCallback(
      (username?: string | null) => {
        if (username) router.push(routes.user(username));
      },
      [router]
    );

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
        {(hasCaption || (isOwnReview && onEdit)) && (
          <View style={styles.captionSection}>
            {hasCaption ? (
              <InlineIdentityText
                username={review.profile?.username || "Unknown"}
                isVerified={review.profile?.is_verified}
                body={review.comment}
                usernameStyle={styles.captionUsername}
                bodyStyle={styles.captionText}
                onUsernamePress={
                  isOwnReview
                    ? undefined
                    : () => openProfile(review.profile?.username)
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
            {previewComments.map((c: any) => (
              <TouchableOpacity
                key={c.id}
                style={styles.commentItem}
                onPress={handleShowComments}
                activeOpacity={0.7}
              >
                <InlineIdentityText
                  username={c.profile?.username || "Unknown"}
                  isVerified={c.profile?.is_verified}
                  body={c.body}
                  usernameStyle={styles.commentUsername}
                  onUsernamePress={() => openProfile(c.profile?.username)}
                />
              </TouchableOpacity>
            ))}

            {commentCount > 2 && (
              <TouchableOpacity onPress={handleShowComments}>
                <Text style={styles.viewAllCommentsText}>
                  View all {commentCount} comments
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        {/* The actions sit under a hairline at the foot of the card, where
            the design puts them — and where they stay above the tab bar. */}
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
      </View>
    );
  }
);
ReviewFooter.displayName = "ReviewFooter";

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
    prev.location?.rating === next.location?.rating &&
    prev.location?.total_ratings === next.location?.total_ratings &&
    prev.profile?.is_verified === next.profile?.is_verified &&
    prevProps.canDelete === nextProps.canDelete &&
    prevProps.hideHeader === nextProps.hideHeader &&
    prevProps.hideFooter === nextProps.hideFooter &&
    prevProps.previewMode === nextProps.previewMode &&
    prevProps.isVisible === nextProps.isVisible
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
  hideHeader = false,
  hideFooter = false,
  previewMode = false,
}: ReviewItemProps) => {
  const { profile } = useProfile();
  const styles = useStyles();
  const { colors } = useTheme();
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const lastTapRef = useRef<number>(0);
  const isOwnReview = String(profile?.id) === String(review.profile?.id);
  const tier = getRankTier(review.profile?.review_count);

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
  const previewComments = hasLoaded
    ? comments.slice(-2)
    : [...(review.recent_comments ?? [])].reverse();

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

  const handlePress = useCallback(() => {
    const now = Date.now();
    if (lastTapRef.current && now - lastTapRef.current < DOUBLE_TAP_DELAY) {
      handleToggleLike();
    }
    lastTapRef.current = now;
  }, [handleToggleLike]);

  const handleReportSubmit = useCallback(
    async (reason: string, customReason?: string) => {
      if (!profile) return;

      try {
        const reportData = {
          reporter_id: profile.id,
          review_id: review.id,
          creator_id: review.profile?.id,
          reason: customReason || reason,
          created_at: new Date().toISOString(),
        };

        const { error } = await supabase.from("reports").insert([reportData]);

        if (error) {
          reportError("Error submitting report:", error);
          Alert.alert("Error", "Failed to submit report. Please try again.");
        } else {
          // Track report event
          AnalyticService.capture("report", {
            reviewId: review.id,
            reason: customReason || reason,
            targetUserId: review.profile?.id,
          });
          Alert.alert(
            "Report Submitted",
            "Thank you for your report. We will review it shortly."
          );
        }
      } catch (error) {
        reportError("Unexpected error submitting report:", error);
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    },
    [profile, review.id, review.profile?.id]
  );

  const handleShare = useCallback(() => {
    void shareReviewViaSheet(review);
  }, [review]);

  if (previewMode) {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.imageContainer}>
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
          comments={[]}
          hasLoaded={false}
          commentCount={0}
          previewComments={[]}
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
      <Pressable style={styles.card} onPress={handlePress}>
        {!hideHeader && (
          <View style={styles.header}>
            <AvatarWrapper
              avatarUrl={review.profile?.avatar_url || null}
              username={review.profile?.username}
              isVerified={review.profile?.is_verified}
              isOwnReview={isOwnReview}
              reviewCount={review.profile?.review_count}
              postedAt={review.inserted_at}
            />
            <View style={styles.headerActions}>
              {tier ? <Badge label={tier.name} tone="green" /> : null}
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
        )}

        <View style={styles.imageContainer}>
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

        {!hideFooter && (
          <ReviewFooter
            review={review}
            hasLiked={hasLiked}
            likesCount={likesCount}
            comments={comments}
            hasLoaded={hasLoaded}
            commentCount={commentCount}
            previewComments={previewComments}
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
        )}
      </Pressable>

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
    paddingLeft: t.spacing.lg - 1,
    paddingRight: t.spacing.md,
    paddingTop: t.spacing.md + 1,
    paddingBottom: t.spacing.md,
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
    fontSize: 15,
    lineHeight: 18,
    fontFamily: fonts.extrabold,
    letterSpacing: -0.15,
    color: t.colors.text,
  },
  headerTimestamp: {
    ...t.typography.mono,
    fontSize: 12,
    lineHeight: 16,
    color: t.colors.textMuted,
  },
  headerIdentity: {
    flex: 1,
    minWidth: 0,
    gap: 3,
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
    gap: t.spacing.md - 1,
  },
  imageContainer: {
    width: CARD_WIDTH,
    height: PHOTO_HEIGHT, // 4:3
    position: "relative" as const,
  },
  reviewImage: {
    width: "100%" as const,
    height: "100%" as const,
    backgroundColor: t.colors.imagePlaceholder,
  },
  // The only things left on the photo: where it was, and what was in it. One
  // row, so a long venue name gives way to the pills instead of running under
  // them.
  venueScore: {
    position: "absolute" as const,
    left: t.spacing.md,
    top: t.spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 6,
    paddingHorizontal: t.spacing.md - 2,
    paddingVertical: 6,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.scrimStrong,
  },
  venueScoreText: {
    ...t.typography.mono,
    fontSize: 12,
    lineHeight: 15,
    color: t.colors.textOnImage,
  },
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
    flexShrink: 1,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    paddingLeft: t.spacing.md - 1,
    paddingRight: t.spacing.lg - 2,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.scrimStrong,
  },
  venueChipLines: {
    flexShrink: 1,
    gap: 1,
  },
  venueChipText: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: fonts.bold,
    color: t.colors.textOnImage,
    flexShrink: 1,
  },
  venueChipMeta: {
    ...t.typography.mono,
    fontSize: 10.5,
    lineHeight: 14,
    color: t.colors.accentOnImage,
    flexShrink: 1,
  },
  photoPills: {
    flexShrink: 0,
    flexDirection: "row" as const,
    gap: 6,
  },
  photoPill: {
    paddingHorizontal: t.spacing.md - 1,
    paddingVertical: 7,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.scrimStrong,
  },
  photoPillLoud: {
    backgroundColor: t.colors.highlight,
  },
  photoPillText: {
    ...t.typography.eyebrow,
    fontSize: 10.5,
    letterSpacing: 1,
    color: t.colors.textOnImage,
  },
  photoPillLoudText: {
    color: t.colors.onHighlight,
  },
  // A review is two scores. They read as olives — the brand's own scale —
  // with the blended TTC number beside them, never instead of them.
  scores: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: t.spacing.lg,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.lg - 2,
    backgroundColor: t.colors.surface,
  },
  scoreAxis: {
    gap: 7,
  },
  scoreLabel: {
    ...t.typography.eyebrow,
    fontSize: 10,
    color: t.colors.textMuted,
  },
  scoreOverall: {
    flex: 1,
    alignItems: "flex-end" as const,
    gap: 3,
  },
  scoreOverallValue: {
    fontSize: 26,
    lineHeight: 28,
    fontFamily: fonts.black,
    letterSpacing: -1,
    // The score belongs to the olives beside it, so it takes their green
    // rather than the primary purple.
    color: t.colors.secondary,
    fontVariant: ["tabular-nums"] as const,
  },
  footer: {
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.md - 1,
  },
  // A hairline separates the actions from the reading matter above them,
  // rather than boxing the whole footer.
  actionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.lg + 2,
    borderTopWidth: 1,
    borderTopColor: t.colors.divider,
    marginTop: t.spacing.md - 1,
    paddingTop: t.spacing.md - 1,
    paddingBottom: t.spacing.md + 1,
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
    fontSize: 13.5,
    lineHeight: 18,
    fontFamily: fonts.semibold,
    color: t.colors.textSecondary,
    fontVariant: ["tabular-nums"] as const,
  },
  actionLiked: {
    color: t.colors.like,
  },
  likesCount: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  captionSection: {
    marginBottom: t.spacing.xs,
  },
  captionText: {
    ...t.typography.body,
    fontSize: 14,
    lineHeight: 21,
    color: t.colors.text,
  },
  inlineBody: {
    ...t.typography.caption,
    color: t.colors.text,
    flexShrink: 1,
  },
  captionUsername: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  captionBody: {
    ...t.typography.body,
    color: t.colors.text,
  },
  addCaptionText: {
    ...t.typography.body,
    fontFamily: fonts.medium,
    color: t.colors.textSecondary,
  },
  commentItem: {
    marginBottom: t.spacing.xs,
  },
  commentUsername: {
    ...t.typography.caption,
    fontFamily: fonts.semibold,
    color: t.colors.text,
  },
  timestamp: {
    ...t.typography.micro,
    color: t.colors.textMuted,
  },
  viewAllCommentsText: {
    ...t.typography.caption,
    color: t.colors.textMuted,
    marginBottom: t.spacing.xs,
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
