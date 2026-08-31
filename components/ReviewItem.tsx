import React, { useState, useCallback, memo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useRouter } from "expo-router";
import { useProfile } from "@/context/profile-context";
import {
  Avatar,
  MartiniIcon,
  LocationVerifiedBadge,
  RatingPips,
  PIPS_MAX,
  VerifiedName,
} from "@/components/shared";
import ReviewTag from "@/components/shared/review-tag";
import { Comment, Review } from "@/types/types";
import {
  formatCityRegion,
  formatRelativeDate,
  stripNameFromAddress,
} from "@/utils/helpers";
import { calculateOverallRating, formatRating } from "@/utils/ratingUtils";
import ReportModal from "@/components/ReportModal";
import ActionSheet from "@/components/ActionSheet";
import ReviewImageViewer from "@/components/ReviewImageViewer";
import { HIT_SLOP, makeStyles, useTheme } from "@/theme";
import { useOpenProfile } from "@/hooks/useAppNavigation";
import { useMembership } from "@/context/membership-context";
import { routes } from "@/utils/routes";
import { useReviewEngagement } from "@/hooks/useReviewEngagement";
import {
  runNavigation,
  areReviewItemPropsEqual,
  type ReviewItemMemoProps,
} from "@/utils/reviewItemMemo";
import MentionText from "@/components/mentions/MentionText";
import type { MentionSpan } from "@/types/types";

/**
 * 16:11, the aspect the card is drawn at. A taller photo pushed the like /
 * comment / share row under the tab bar on a 6.1" — with the scores now
 * sitting below the image as well, the photo has to give that height back.
 * Uploads are stored uncropped and centre-crop here via `contentFit="cover"`.
 */
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
  mentions,
  onNavigate,
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
  mentions?: MentionSpan[];
  onNavigate?: (navigate: () => void) => void;
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
      <Text> </Text>
      <MentionText
        text={body}
        mentions={mentions}
        style={bodyStyle}
        onNavigate={onNavigate}
      />
    </Text>
  );
};

type ReviewItemProps = ReviewItemMemoProps;

// Reusable UI Components
const AvatarWrapper = memo(
  ({
    avatarUrl,
    username,
    isVerified,
    authorId,
    reviewCount,
    onNavigate,
  }: {
    avatarUrl: string | null;
    username?: string;
    isVerified?: boolean;
    authorId?: string | null;
    reviewCount?: number | null;
    onNavigate?: (navigate: () => void) => void;
  }) => {
    const openProfile = useOpenProfile();
    const styles = useStyles();

    const handlePress = useCallback(() => {
      runNavigation(() => openProfile(username, authorId), onNavigate);
    }, [authorId, onNavigate, openProfile, username]);

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
interface PhotoChipsProps {
  review: Review;
  onNavigate?: (navigate: () => void) => void;
}

const PhotoChips = memo(({ review, onNavigate }: PhotoChipsProps) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
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

  const locationId = review.location?.id;
  const handleLocationPress = useCallback(() => {
    if (!locationId) return;
    runNavigation(() => router.push(routes.place(locationId)), onNavigate);
  }, [locationId, onNavigate, router]);

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
        <TouchableOpacity
          style={styles.venueChip}
          activeOpacity={0.8}
          onPress={handleLocationPress}
          accessibilityRole="link"
          accessibilityLabel={
            venueRating != null
              ? `${review.location?.name || "Place"}, ${formatRating(
                  venueRating
                )} from ${venueReviewLabel}`
              : review.location?.name || "Place"
          }
        >
          <View style={styles.venueChipLines}>
            <View style={styles.venueChipNameRow}>
              {review.location?.is_golden_glass ? (
                <MartiniIcon size={20} color={colors.awardGold} filled />
              ) : null}
              <Text style={styles.venueChipText} numberOfLines={1}>
                {review.location?.name || "N/A"}
              </Text>
              {review.location?.is_location_verified ? (
                <LocationVerifiedBadge compact />
              ) : null}
            </View>
            {cityCountry ? (
              <Text style={styles.venueChipMeta} numberOfLines={1}>
                {cityCountry}
              </Text>
            ) : null}
            {venueRating != null ? (
              <View style={styles.venueChipRating}>
                <RatingPips value={1} max={1} size={13} accessibilityLabel="" />
                <Text style={styles.venueChipRatingText} numberOfLines={1}>
                  {formatRating(venueRating)} · {venueReviewLabel}
                </Text>
              </View>
            ) : null}
          </View>
        </TouchableOpacity>
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
        <View style={styles.scorePips}>
          <RatingPips
            value={review.taste ?? 0}
            size={15}
            accessibilityLabel=""
          />
        </View>
      </View>
      <View style={styles.scoreAxis}>
        <Text style={styles.scoreLabel}>Presentation</Text>
        <View style={styles.scorePips}>
          <RatingPips
            value={review.presentation ?? 0}
            size={15}
            accessibilityLabel=""
          />
        </View>
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
    onNavigate,
  }: {
    comment: Comment;
    onShowComments: () => void;
    onToggleLike: (comment: Comment) => void;
    onNavigate?: (navigate: () => void) => void;
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
                runNavigation(
                  () =>
                    openProfile(comment.profile?.username, comment.profile?.id),
                  onNavigate
                )
              }
              mentions={comment.mentions}
              onNavigate={onNavigate}
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
    onNavigate,
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
    onNavigate?: (navigate: () => void) => void;
  }) => {
    const styles = useStyles();

    // Shared route: resolves inside whichever tab stack is rendering.
    const openProfile = useOpenProfile();

    const { requireMembership } = useMembership();

    const handleShowComments = useCallback(() => {
      // Visitors get the membership CTA straight from the comment button,
      // not the slider (which only gates posting).
      if (!requireMembership("comment")) return;
      onShowComments(review.id, onCommentAdded, onCommentDeleted);
    }, [
      review.id,
      onShowComments,
      onCommentAdded,
      onCommentDeleted,
      requireMembership,
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
                  runNavigation(
                    () =>
                      openProfile(review.profile?.username, review.profile?.id),
                    onNavigate
                  )
                }
                mentions={review.mentions}
                onNavigate={onNavigate}
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
                onNavigate={onNavigate}
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

const ReviewItemComponent = ({
  review,
  canDelete,
  onDelete,
  onEdit,
  onShowLikes,
  onShowComments,
  onCommentAdded,
  onCommentDeleted,
  onNavigate,
  previewMode = false,
}: ReviewItemProps) => {
  const { profile } = useProfile();
  const { requireMembership } = useMembership();
  const styles = useStyles();
  const { colors } = useTheme();
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const isOwnReview = String(profile?.id) === String(review.profile?.id);
  const {
    commentCount,
    handleReportSubmit,
    handleShare,
    handleShowLikes,
    handleToggleCommentLike,
    handleToggleLike,
    hasLiked,
    likesCount,
    previewComments,
  } = useReviewEngagement({
    review,
    profile,
    onShowLikes,
  });

  // No double-tap-to-like: liking lives on the heart button, so a tap on the
  // photo opens the viewer immediately instead of waiting out a second tap.
  const handleImagePress = useCallback(() => {
    setImageViewerVisible(true);
  }, []);

  if (previewMode) {
    return (
      <View style={styles.previewContainer}>
        <View style={styles.imageContainer} testID="review-photo">
          <ExpoImage
            source={{ uri: review.image_url }}
            style={styles.reviewImage}
            contentFit="cover"
            transition={previewMode ? 200 : 0}
            placeholderContentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={review.id}
          />
          <PhotoChips review={review} onNavigate={onNavigate} />
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
              onNavigate={onNavigate}
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

        <View style={styles.imageContainer} testID="review-photo">
          <Pressable
            style={styles.imagePressTarget}
            onPress={handleImagePress}
            accessibilityRole="button"
            accessibilityLabel="View review photo"
          >
            <ExpoImage
              source={{ uri: review.image_url }}
              style={styles.reviewImage}
              contentFit="cover"
              transition={previewMode ? 200 : 0}
              placeholderContentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={review.id}
            />
          </Pressable>
          <PhotoChips review={review} onNavigate={onNavigate} />
        </View>

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
            onShowLikes={() => handleShowLikes()}
            onShowComments={onShowComments}
            onShare={handleShare}
            onCommentAdded={onCommentAdded}
            onCommentDeleted={onCommentDeleted}
            onEdit={onEdit}
            isOwnReview={isOwnReview}
            onNavigate={onNavigate}
          />
        }
      </View>

      <ActionSheet
        visible={actionSheetVisible}
        onClose={() => setActionSheetVisible(false)}
        onDelete={onDelete}
        onEdit={onEdit}
        onShare={handleShare}
        onReport={() => {
          if (requireMembership("report")) setReportModalVisible(true);
        }}
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

const ReviewItem = memo(ReviewItemComponent, areReviewItemPropsEqual);

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
    aspectRatio: 4 / 5,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  imagePressTarget: {
    width: "100%" as const,
    height: "100%" as const,
  },
  reviewImage: {
    width: "100%" as const,
    height: "100%" as const,
    backgroundColor: t.colors.imagePlaceholder,
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
    gap: 0,
  },
  venueChipText: {
    ...t.typography.title,
    letterSpacing: 0,
    color: t.colors.textOnImage,
    flexShrink: 1,
  },
  venueChipNameRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs,
    minWidth: 0,
  },
  venueChipRating: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 5,
    minWidth: 0,
    marginTop: 2,
  },
  venueChipRatingText: {
    ...t.typography.mono,
    color: t.colors.textOnImage,
    flexShrink: 1,
  },
  venueChipMeta: {
    ...t.typography.caption,
    color: t.colors.textOnImage,
    flexShrink: 1,
    marginTop: 2,
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
  // The same sunken well places put around their olives (see the map peek
  // sheet and the venue header), so ratings read as one system everywhere.
  scorePips: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceSunken,
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
