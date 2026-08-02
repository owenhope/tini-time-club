import React, { useCallback, useState } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Review } from "@/types/types";
import ReviewItem from "@/components/ReviewItem";
import { makeStyles, useTheme, HIT_SLOP } from "@/theme";
import { Skeleton } from "@/components/shared";
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
  onShowComments?: (
    reviewId: string,
    onCommentAdded: any,
    onCommentDeleted: any
  ) => void;
  onCommentAdded?: (reviewId: string, newComment: any) => void;
  onCommentDeleted?: (reviewId: string, commentId: number) => void;
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
  onShowComments,
  onCommentAdded,
  onCommentDeleted,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  // Read here, not inside the Modal: a RN Modal renders in its own view
  // hierarchy, so SafeAreaView inside it gets zero insets and the bar rode up
  // under the status bar.
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const [active, setActive] = useState<Review | null>(null);

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
              ? locationLabel
              : `${locationLabel}, overall score ${scoreLabel}`
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
              <Ionicons name="star" size={11} color={colors.textOnImage} />
              <Text style={styles.tileScoreText}>{scoreLabel}</Text>
            </View>
          ) : null}
        </Pressable>
      );
    },
    [colors.textOnImage, styles, tileSize]
  );

  return (
    <>
      <FlatList
        data={reviews}
        renderItem={renderTile}
        keyExtractor={(item) => String(item.id)}
        numColumns={COLUMNS}
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
        contentContainerStyle={styles.content}
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

      <Modal
        visible={active !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setActive(null)}
      >
        <View style={styles.sheet}>
          <View style={[styles.sheetBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => setActive(null)}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel="Back"
              style={styles.backButton}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text} />
            </Pressable>
            <Text style={styles.sheetTitle} numberOfLines={1}>
              {active?.location?.name ?? "Review"}
            </Text>
            {/* Balances the back button so the title stays centred. */}
            <View style={styles.backButton} />
          </View>

          <ScrollView contentContainerStyle={styles.sheetBody}>
            {active && (
              <ReviewItem
                review={active}
                canDelete={canDelete}
                onDelete={onDelete ? () => onDelete(active) : undefined}
                onEdit={onEdit ? () => onEdit(active) : undefined}
                onShowLikes={() => {}}
                onShowComments={onShowComments ?? (() => {})}
                onCommentAdded={onCommentAdded ?? (() => {})}
                onCommentDeleted={onCommentDeleted ?? (() => {})}
              />
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const useStyles = makeStyles((t) => ({
  content: {
    paddingBottom: t.spacing.xxl,
    backgroundColor: t.colors.background,
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
  },
  tilePressed: {
    opacity: 0.75,
  },
  tileImage: {
    width: "100%" as const,
    height: "100%" as const,
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
    ...t.typography.label,
    color: t.colors.textOnImage,
    fontVariant: ["tabular-nums"] as const,
    textShadowColor: t.colors.overlay,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  sheet: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  sheetBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  sheetTitle: {
    ...t.typography.heading,
    color: t.colors.text,
    flexShrink: 1,
    textAlign: "center" as const,
  },
  backButton: {
    width: 32,
    minHeight: 44,
    justifyContent: "center" as const,
  },
  sheetBody: {
    paddingBottom: t.spacing.xxl,
  },
}));

export default ReviewGrid;
