import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  Modal,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Review } from "@/types/types";
import ReviewItem from "@/components/ReviewItem";
import CommentsSlider from "@/components/CommentsSlider";
import LikeSlider from "@/components/LikeSlider";
import AppHeader from "@/components/nav/AppHeader";
import { makeStyles, useTheme } from "@/theme";
import {
  LocationVerifiedBadge,
  MartiniIcon,
  RatingPips,
  Skeleton,
} from "@/components/shared";
import { calculateOverallRating, formatRating } from "@/utils/ratingUtils";

const COLUMNS = 3;
const GAP = 2;

export interface ReviewGridProps {
  reviews: Review[];
  /** Profile header; scrolls away with the grid. */
  header?: React.ReactElement | null;
  emptyComponent?: React.ReactElement | null;
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onEndReached?: () => void;
  /** Passed through to the expanded card. */
  canDelete?: boolean;
  onDelete?: (review: Review) => void;
  onEdit?: (review: Review) => void;
  /**
   * Called when the sheet's own comment slider changes something, so the list
   * behind it can patch the row. The grid opens the slider itself — see below.
   */
  onCommentAdded?: (reviewId: string, newComment: any) => void;
  onCommentDeleted?: (reviewId: string, commentId: number) => void;
  /** Lets place pages use the same white review well as expanded reviews. */
  contentTone?: "paper" | "surface";
  /** Profile grids identify the venue; venue grids identify the reviewer. */
  tileLabel?: "location" | "reviewer";
}

/**
 * Reviews as a square thumbnail grid, with the profile header scrolling above
 * it — the arrangement people already know from photo-sharing apps, so a whole
 * profile is visible at a glance instead of one full-width card at a time.
 *
 * There is no review detail route, so tapping a tile opens the existing
 * ReviewItem card full screen with a back button. Nothing is lost: likes,
 * comments and the per-review actions all come along.
 */
const ReviewGrid: React.FC<ReviewGridProps> = ({
  reviews,
  header,
  emptyComponent,
  loading = false,
  refreshing = false,
  onRefresh,
  onScroll,
  onEndReached,
  canDelete = false,
  onDelete,
  onEdit,
  onCommentAdded,
  onCommentDeleted,
  contentTone = "paper",
  tileLabel = "location",
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const [active, setActive] = useState<Review | null>(null);
  /**
   * Comments and likes for the expanded card are opened and rendered inside
   * the sheet, not by the screen behind it. A page-sheet Modal is its own
   * native window: a bottom sheet mounted in the screen's tree slides up
   * *under* it, which looked like the tap had done nothing.
   */
  const [commentsFor, setCommentsFor] = useState<Review | null>(null);
  const [likesFor, setLikesFor] = useState<string | null>(null);
  const pendingNavigationRef = useRef<(() => void) | null>(null);

  /** Closing the sheet has to take its own sheets with it. */
  const closeSheet = useCallback(() => {
    setCommentsFor(null);
    setLikesFor(null);
    setActive(null);
  }, []);

  const handleReviewNavigation = useCallback(
    (navigate: () => void) => {
      pendingNavigationRef.current = navigate;
      closeSheet();
    },
    [closeSheet]
  );

  const handleSheetDismiss = useCallback(() => {
    const navigate = pendingNavigationRef.current;
    pendingNavigationRef.current = null;
    navigate?.();
  }, []);

  const tileSize = (windowWidth - GAP * (COLUMNS - 1)) / COLUMNS;

  const renderTile = useCallback(
    ({ item, index }: { item: Review; index: number }) => {
      const overallScore = calculateOverallRating(
        item.taste,
        item.presentation
      );
      const scoreLabel = formatRating(overallScore);
      const locationLabel = item.location?.name
        ? `Review at ${item.location.name}`
        : "Open review";
      const tileLabelText =
        tileLabel === "reviewer" ? item.profile?.username : item.location?.name;
      const accessibilityLabel =
        tileLabel === "reviewer" && item.profile?.username
          ? `Review by ${item.profile.username} at ${item.location?.name ?? "this location"}`
          : locationLabel;

      return (
        <Pressable
          onPress={() => setActive(item)}
          style={({ pressed }) => [
            styles.tile,
            {
              width: tileSize,
              height: tileSize,
              marginRight: (index + 1) % COLUMNS === 0 ? 0 : GAP,
            },
            pressed && styles.tilePressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel={
            overallScore == null
              ? accessibilityLabel
              : `${accessibilityLabel}, overall score ${scoreLabel}`
          }
          accessibilityHint="Opens the full review"
        >
          <ExpoImage
            source={{ uri: item.image_url }}
            style={styles.tileImage}
            contentFit="cover"
            transition={150}
            cachePolicy="memory-disk"
            recyclingKey={String(item.id)}
          />
          {overallScore != null ? (
            <View style={styles.tileScore} accessibilityElementsHidden>
              <RatingPips value={1} max={1} size={11} accessibilityLabel="" />
              <Text style={styles.tileScoreText}>{scoreLabel}</Text>
            </View>
          ) : null}
          {tileLabelText ? (
            <View
              style={styles.tileLocation}
              pointerEvents="none"
              accessibilityElementsHidden
            >
              <View style={styles.tileLocationRow}>
                {tileLabel === "location" && item.location?.is_golden_glass ? (
                  <MartiniIcon size={17} color={colors.awardGold} filled />
                ) : null}
                <Text style={styles.tileLocationText} numberOfLines={1}>
                  {tileLabelText}
                </Text>
                {tileLabel === "location" &&
                item.location?.is_location_verified ? (
                  <LocationVerifiedBadge compact />
                ) : null}
              </View>
            </View>
          ) : null}
        </Pressable>
      );
    },
    [colors, styles, tileLabel, tileSize]
  );

  return (
    <>
      <FlatList
        data={reviews}
        renderItem={renderTile}
        keyExtractor={(item) => String(item.id)}
        numColumns={COLUMNS}
        style={[styles.list, contentTone === "surface" && styles.listSurface]}
        ListHeaderComponent={header}
        ListEmptyComponent={
          loading ? (
            <View style={styles.skeletonGrid}>
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton
                  key={i}
                  width={tileSize}
                  height={tileSize}
                  radius={0}
                />
              ))}
            </View>
          ) : (
            emptyComponent
          )
        }
        onScroll={onScroll}
        scrollEventThrottle={16}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.4}
        columnWrapperStyle={reviews.length > 0 ? styles.row : undefined}
        contentContainerStyle={[
          styles.content,
          contentTone === "surface" && styles.contentSurface,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          ) : undefined
        }
      />

      {/* A page sheet, not a full-screen push: a review opened from a grid is
          a peek, and the platform's own swipe-down closes it. */}
      <Modal
        visible={active !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeSheet}
        onDismiss={handleSheetDismiss}
      >
        {/* Its own gesture root: the app's is in the screen's window, and a
            bottom sheet in here would take no pan without one. */}
        <GestureHandlerRootView style={styles.sheet}>
          {/* Variant D: the sheet is presented, so it gets the grabber and a
              text dismissal action rather than a back chevron. */}
          <AppHeader
            variant="modal"
            title={active?.location?.name ?? "Review"}
            action={{ label: "Close", onPress: closeSheet }}
          />

          <ScrollView contentContainerStyle={styles.sheetBody}>
            {active && (
              <ReviewItem
                review={active}
                canDelete={canDelete}
                onDelete={onDelete ? () => onDelete(active) : undefined}
                onEdit={onEdit ? () => onEdit(active) : undefined}
                onShowLikes={() => setLikesFor(String(active.id))}
                onShowComments={() => setCommentsFor(active)}
                onCommentAdded={onCommentAdded ?? (() => {})}
                onCommentDeleted={onCommentDeleted ?? (() => {})}
                onNavigate={handleReviewNavigation}
              />
            )}
          </ScrollView>

          {commentsFor && (
            <CommentsSlider
              review={commentsFor}
              onClose={() => setCommentsFor(null)}
              onCommentAdded={onCommentAdded}
              onCommentDeleted={onCommentDeleted}
              onNavigate={handleReviewNavigation}
            />
          )}

          {likesFor && (
            <LikeSlider
              reviewId={likesFor}
              onClose={() => setLikesFor(null)}
              onNavigate={handleReviewNavigation}
            />
          )}
        </GestureHandlerRootView>
      </Modal>
    </>
  );
};

const useStyles = makeStyles((t) => ({
  list: {
    backgroundColor: t.colors.background,
  },
  listSurface: {
    backgroundColor: t.colors.surface,
  },
  content: {
    paddingBottom: t.spacing.xxl,
    backgroundColor: t.colors.background,
  },
  contentSurface: {
    backgroundColor: t.colors.surface,
  },
  row: {
    marginBottom: GAP,
  },
  skeletonGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: GAP,
  },
  tile: {
    backgroundColor: t.colors.imagePlaceholder,
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  tilePressed: {
    opacity: 0.75,
  },
  tileImage: {
    position: "absolute" as const,
    top: -2,
    right: -2,
    bottom: -2,
    left: -2,
  },
  tileScore: {
    position: "absolute" as const,
    top: 6,
    right: 6,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: t.spacing.xs,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.scrimStrong,
  },
  tileScoreText: {
    ...t.typography.bodyStrong,
    color: t.colors.textOnImage,
    fontVariant: ["tabular-nums"] as const,
    textShadowColor: t.colors.overlay,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  tileLocation: {
    position: "absolute" as const,
    left: 6,
    bottom: 6,
    maxWidth: "88%" as const,
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: t.radius.xs,
    backgroundColor: t.colors.scrimStrong,
  },
  tileLocationText: {
    ...t.typography.caption,
    color: t.colors.textOnImage,
  },
  tileLocationRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 4,
    minWidth: 0,
  },
  sheet: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  sheetBody: {
    paddingBottom: t.spacing.xxl,
  },
}));

export default ReviewGrid;
