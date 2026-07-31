import React, { useRef, useState, useEffect, useCallback, memo } from "react";
import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Animated,
  Modal,
  Alert,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { Link, useRouter } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { supabase } from "@/utils/supabase";
import imageCache from "@/utils/imageCache";
import { Avatar, RatingSummary, VerifiedName } from "@/components/shared";
import { Review } from "@/types/types";
import * as Haptics from "expo-haptics";
import {
  stripNameFromAddress,
  formatRelativeDate,
  formatCityRegion,
} from "@/utils/helpers";
import { calculateOverallRating } from "@/utils/ratingUtils";
import ReportModal from "@/components/ReportModal";
import ActionSheet from "@/components/ActionSheet";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { BRAND, makeStyles, useTheme } from "@/theme";

// Constants
const SCREEN_WIDTH = Dimensions.get("window").width;
const DOUBLE_TAP_DELAY = 300;
const ANIMATION_DURATION = 300;

const ICON_SIZES = {
  small: 20,
  medium: 24,
} as const;

// Icon-only controls render at 20-24px; this brings the tappable area up
// toward the 44pt minimum without changing the layout.
const HIT_SLOP = { top: 10, bottom: 10, left: 10, right: 10 };

const InlineIdentityText = ({
  username,
  isVerified,
  body,
  usernameStyle,
}: {
  username: string;
  isVerified?: boolean | null;
  body: string;
  usernameStyle: StyleProp<TextStyle>;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <Text style={styles.inlineBody}>
      <Text style={usernameStyle}>{username}</Text>
      {isVerified ? (
        <MaterialIcons name="verified" size={13} color={colors.accent} />
      ) : null}
      <Text> {body}</Text>
    </Text>
  );
};

// Expandable Text Component for Instagram-style captions
const ExpandableText = ({
  username,
  text,
  maxLines = 2,
}: {
  username?: string;
  text: string;
  maxLines?: number;
}) => {
  const styles = useStyles();
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowMore, setShouldShowMore] = useState(false);

  const onTextLayout = useCallback(
    (event: any) => {
      const { lines } = event.nativeEvent;
      setShouldShowMore(lines.length > maxLines);
    },
    [maxLines]
  );

  const toggleExpanded = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  return (
    <Text style={styles.captionText}>
      {username && <Text style={styles.captionUsername}>{username} </Text>}
      <Text
        numberOfLines={isExpanded ? undefined : maxLines}
        onTextLayout={onTextLayout}
        style={styles.captionBody}
      >
        {text}
      </Text>
      {shouldShowMore && (
        <Text style={styles.moreText} onPress={toggleExpanded}>
          {isExpanded ? " less" : " more"}
        </Text>
      )}
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

// Custom hook for avatar loading
const useAvatar = (avatarUrl: string | null | undefined) => {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!avatarUrl) {
        setUrl(null);
        return;
      }

      setLoading(true);
      try {
        const avatarUrlResult = await imageCache.getAvatarUrl(avatarUrl);
        setUrl(avatarUrlResult);
      } catch (error) {
        console.error("Error loading avatar:", error);
        setUrl(null);
      } finally {
        setLoading(false);
      }
    };

    loadAvatar();
  }, [avatarUrl]);

  return { url, loading };
};

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
      console.error("Error toggling like:", error);
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
      console.error("Error fetching comments:", error);
    } finally {
      setLoading(false);
    }
  }, [reviewId, hasLoaded]);

  const addComment = useCallback((newComment: any) => {
    setComments((prev) => [...prev, newComment]);
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
  }: {
    avatarUrl: string | null;
    username?: string;
    isVerified?: boolean;
    isOwnReview: boolean;
  }) => {
    const router = useRouter();
    const styles = useStyles();

    const handlePress = useCallback(() => {
      if (!isOwnReview && username) {
        // Shared route: resolves inside whichever tab stack is rendering.
        router.push(`/users/${username}`);
      }
    }, [isOwnReview, username, router]);

    const content = (
      <View style={styles.headerProfile}>
        <Avatar
          avatarPath={avatarUrl}
          username={username}
          size={40}
          style={styles.avatar}
        />
        <VerifiedName
          name={username || "Unknown"}
          isVerified={isVerified}
          style={styles.headerIdentity}
          textStyle={styles.headerUsername}
        />
      </View>
    );

    if (isOwnReview) {
      return content;
    }

    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
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

const CommentCount = memo(({ count }: { count: number }) => {
  const styles = useStyles();
  return <Text style={styles.likesCount}>{count}</Text>;
});

const ReviewOverlay = memo(
  ({
    review,
    overlayOpacity,
    onToggleOverlay,
    isOverlayVisible,
    animateRatings,
  }: {
    review: Review;
    overlayOpacity: Animated.Value;
    onToggleOverlay: () => void;
    isOverlayVisible: boolean;
    animateRatings: boolean;
  }) => {
    const styles = useStyles();
    const overallScore = calculateOverallRating(
      review.taste,
      review.presentation
    );

    return (
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <View style={styles.venueBlock}>
          <Link href={`/places/${review.location?.id}`} asChild>
            <TouchableOpacity style={styles.locationLinkContainer}>
              <Text style={styles.locationName}>
                {review.location?.name || "N/A"}
                {"\u00a0"}
                {/* Raw brand lavender rather than colors.accent: this chevron
                    sits on the dark photo scrim in both schemes. */}
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={BRAND.lavender}
                />
              </Text>
            </TouchableOpacity>
          </Link>
          {review.location?.address && (
            <Text style={styles.locationAddress}>
              {formatCityRegion(
                stripNameFromAddress(
                  review.location.name,
                  review.location.address
                )
              )}
            </Text>
          )}
        </View>

        <View style={styles.reviewRatingBlock}>
          <View style={styles.reviewAttributes}>
            <View style={styles.reviewAttribute}>
              <Text style={styles.attributeHeading}>Spirit</Text>
              <Text style={styles.spiritText}>
                {review.spirit?.name || "N/A"}
              </Text>
            </View>
            <View style={styles.reviewAttribute}>
              <Text style={styles.attributeHeading}>Type</Text>
              <Text style={styles.spiritText}>
                {review.type?.name || "N/A"}
              </Text>
            </View>
          </View>
          <RatingSummary
            overall={overallScore}
            taste={review.taste}
            presentation={review.presentation}
            showReviewCount={false}
            showOverallMeta={false}
            showOverallHeading
            overallPlacement="right"
            breakdownLayout="stacked"
            tone="onImage"
            animateBars={animateRatings}
          />
        </View>
      </Animated.View>
    );
  }
);
ReviewOverlay.displayName = "ReviewOverlay";
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
    onCommentAdded: (reviewId: string, newComment: any) => void;
    onCommentDeleted: (reviewId: string, commentId: number) => void;
    onEdit?: () => void;
    isOwnReview: boolean;
    loadCommentsIfNeeded: () => void;
  }) => {
    const styles = useStyles();

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
        <View style={styles.actionRow}>
          <LikeButton hasLiked={hasLiked} onPress={onToggleLike} />
          <TouchableOpacity onPress={handleShowLikes}>
            <CommentCount count={likesCount} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShowComments}
            style={styles.commentButtonContainer}
          >
            <CommentButton onPress={handleShowComments} count={commentCount} />
            {commentCount > 0 && <CommentCount count={commentCount} />}
          </TouchableOpacity>
        </View>

        {(hasCaption || (isOwnReview && onEdit)) && (
          <View style={styles.captionSection}>
            {hasCaption ? (
              <InlineIdentityText
                username={review.profile?.username || "Unknown"}
                isVerified={review.profile?.is_verified}
                body={review.comment}
                usernameStyle={styles.captionUsername}
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

        <Text style={styles.timestamp}>
          {formatRelativeDate(review.inserted_at)}
        </Text>
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
  isVisible = true,
}: ReviewItemProps) => {
  const { profile } = useProfile();
  const styles = useStyles();
  const { colors } = useTheme();
  const overlayOpacity = useRef(new Animated.Value(1)).current;
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true);
  const lastTapRef = useRef<number>(0);
  const isOwnReview = String(profile?.id) === String(review.profile?.id);

  // Use custom hooks for data management
  const { hasLiked, likesCount, toggleLike } = useLikes(
    review.id,
    profile?.id || null,
    (review as any).likes_count ?? 0,
    (review as any).has_liked ?? false
  );

  const { comments, addComment, removeComment, fetchComments, hasLoaded } =
    useComments(review.id, true);

  // Comment bodies are only needed once the user actually looks at them. The
  // count shown in the footer comes with the feed row, so the previous
  // fetch-on-mount (one query per rendered item) is gone.
  const serverCommentCount = (review as any).comments_count ?? 0;
  const commentCount = hasLoaded ? comments.length : serverCommentCount;

  // Preview comments ride along with the feed row; once the full list has been
  // fetched (user opened the sheet) prefer that.
  const previewComments = hasLoaded
    ? comments.slice(-2)
    : [...((review as any).recent_comments ?? [])].reverse();

  const loadCommentsIfNeeded = useCallback(() => {
    if (!hasLoaded) fetchComments();
  }, [hasLoaded, fetchComments]);

  // Toggle overlay visibility
  const toggleOverlay = useCallback(() => {
    setIsOverlayVisible(!isOverlayVisible);
    Animated.timing(overlayOpacity, {
      toValue: isOverlayVisible ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isOverlayVisible, overlayOpacity]);

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

  const animateOpacity = useCallback(
    (toValue: number) => {
      Animated.timing(overlayOpacity, {
        toValue,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }).start();
    },
    [overlayOpacity]
  );

  const handleLongPress = useCallback(() => {
    setIsOverlayVisible(false);
    animateOpacity(0);
  }, [animateOpacity]);
  const handlePressOut = useCallback(() => {
    setIsOverlayVisible(true);
    animateOpacity(1);
  }, [animateOpacity]);

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
          console.error("Error submitting report:", error);
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
        console.error("Unexpected error submitting report:", error);
        Alert.alert("Error", "An unexpected error occurred. Please try again.");
      }
    },
    [profile, review.id, review.profile?.id]
  );

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
          <ReviewOverlay
            review={review}
            overlayOpacity={overlayOpacity}
            onToggleOverlay={toggleOverlay}
            isOverlayVisible={isOverlayVisible}
            animateRatings={isVisible}
          />
        </View>

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
      <Pressable
        onPress={handlePress}
        onLongPress={handleLongPress}
        onPressOut={handlePressOut}
      >
        {!hideHeader && (
          <View style={styles.header}>
            <AvatarWrapper
              avatarUrl={review.profile?.avatar_url || null}
              username={review.profile?.username}
              isVerified={review.profile?.is_verified}
              isOwnReview={isOwnReview}
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
                  color={colors.text}
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
          <ReviewOverlay
            review={review}
            overlayOpacity={overlayOpacity}
            onToggleOverlay={toggleOverlay}
            isOverlayVisible={isOverlayVisible}
            animateRatings={isVisible}
          />
          {/* Eye icon to toggle overlay - always visible */}
          <TouchableOpacity
            style={styles.eyeIconContainer}
            onPress={toggleOverlay}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={
              isOverlayVisible ? "Hide review details" : "Show review details"
            }
            hitSlop={HIT_SLOP}
          >
            <Ionicons
              name={isOverlayVisible ? "eye" : "eye-off"}
              size={20}
              color={colors.textOnImage}
            />
          </TouchableOpacity>
        </View>

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
  header: {
    paddingHorizontal: 10,
    paddingVertical: t.spacing.md,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    backgroundColor: t.colors.surface,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  actionButton: {
    padding: t.spacing.xs,
  },
  headerUsername: {
    fontWeight: "bold" as const,
    fontSize: 16,
    color: t.colors.text,
  },
  headerIdentity: {
    alignSelf: "center" as const,
  },
  headerProfile: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: t.spacing.sm,
  },
  imageContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_WIDTH, // Instagram-style 1:1 aspect ratio
    position: "relative" as const,
  },
  reviewImage: {
    width: "100%" as const,
    height: "100%" as const,
    backgroundColor: t.colors.imagePlaceholder,
  },
  topBar: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    padding: 10,
    zIndex: 2,
    flexDirection: "row" as const,
    gap: t.spacing.sm,
  },
  overlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: t.colors.overlay,
    padding: t.spacing.xl - 4,
    justifyContent: "flex-end" as const,
    gap: t.spacing.lg,
  },
  venueBlock: {
    gap: t.spacing.xs,
  },
  reviewRatingBlock: {
    width: "100%" as const,
    maxWidth: 280,
    gap: t.spacing.md,
  },
  reviewAttributes: {
    flexDirection: "row" as const,
    gap: t.spacing.md,
    flexShrink: 1,
    alignSelf: "flex-start" as const,
  },
  reviewAttribute: {
    flexShrink: 1,
    alignItems: "flex-start" as const,
  },
  attributeHeading: {
    ...t.typography.caption,
    lineHeight: 18,
    color: "rgba(255,255,255,0.85)",
  },
  locationLinkContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    maxWidth: "100%" as const,
  },
  // Everything below sits on the photo scrim, so it stays light in both
  // schemes rather than following colors.text.
  locationName: {
    fontWeight: "bold" as const,
    fontSize: 22,
    color: t.colors.textOnImage,
    flexShrink: 1,
  },
  locationAddress: {
    fontSize: 14,
    color: t.colors.textOnImage,
  },
  ratingLabel: {
    fontWeight: "bold" as const,
    fontSize: 16,
    marginTop: t.spacing.sm,
    marginBottom: t.spacing.xs,
    color: t.colors.textOnImage,
  },
  eyeIconContainer: {
    position: "absolute" as const,
    bottom: t.spacing.xl - 4,
    right: t.spacing.xl - 4,
    width: 40,
    height: 40,
    borderRadius: t.radius.xl - 4,
    backgroundColor: t.colors.scrim,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    ...t.elevation.raised,
  },
  spiritText: {
    fontSize: 18,
    lineHeight: 22,
    fontWeight: "bold" as const,
    color: t.colors.textOnImage,
    textTransform: "capitalize" as const,
  },
  typeText: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: t.colors.textOnImage,
    textTransform: "capitalize" as const,
  },
  footer: {
    backgroundColor: t.colors.surface,
    padding: 10,
  },
  actionRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: t.spacing.xs,
    gap: t.spacing.sm,
  },
  commentButtonContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs,
  },
  likesCount: {
    fontWeight: "bold" as const,
    fontSize: 16,
    color: t.colors.text,
  },
  captionSection: {
    marginBottom: t.spacing.xs,
  },
  captionText: {
    fontSize: 16,
    lineHeight: 20,
    color: t.colors.text,
  },
  inlineBody: {
    fontSize: 14,
    lineHeight: 18,
    color: t.colors.text,
    flexShrink: 1,
  },
  captionUsername: {
    fontWeight: "600" as const,
    fontSize: 14,
    color: t.colors.text,
  },
  captionBody: {
    fontSize: 16,
    lineHeight: 20,
    color: t.colors.text,
  },
  addCaptionText: {
    fontSize: 16,
    lineHeight: 20,
    color: t.colors.textSecondary,
    fontWeight: "500" as const,
  },
  commentItem: {
    marginBottom: t.spacing.xs,
  },
  commentText: {
    fontSize: 16,
    lineHeight: 20,
    color: t.colors.text,
  },
  commentUsername: {
    fontWeight: "600" as const,
    fontSize: 14,
    color: t.colors.text,
  },
  commentBody: {
    fontSize: 16,
    lineHeight: 20,
    color: t.colors.text,
  },
  username: {
    fontWeight: "bold" as const,
    fontSize: 16,
    color: t.colors.text,
  },
  expandableText: {
    fontSize: 16,
    color: t.colors.text,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    color: t.colors.textMuted,
  },
  moreText: {
    color: t.colors.textSecondary,
    fontSize: 16,
    fontWeight: "400" as const,
  },
  viewAllCommentsText: {
    color: t.colors.textMuted,
    fontSize: 14,
    marginBottom: t.spacing.xs,
  },
  previewContainer: {
    backgroundColor: t.colors.surface,
  },
  previewFooter: {
    paddingHorizontal: 10,
    paddingVertical: t.spacing.md,
    backgroundColor: t.colors.surface,
  },
  previewUsername: {
    fontWeight: "bold" as const,
    fontSize: 16,
    color: t.colors.text,
    marginBottom: t.spacing.xs,
  },
  previewComment: {
    fontSize: 14,
    color: t.colors.text,
    lineHeight: 18,
  },
}));
