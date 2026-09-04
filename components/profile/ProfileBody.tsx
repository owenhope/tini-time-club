import React, { useCallback } from "react";
import {
  FlatList,
  RefreshControl,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import RegularPlaceRow from "@/components/RegularPlaceRow";
import ReviewGrid from "@/components/ReviewGrid";
import { Skeleton } from "@/components/shared";
import type { ProfileContentTab } from "@/components/ProfileContentTabs";
import type { ProfileRegularPlace } from "@/services/regularsService";
import type { Review } from "@/types/types";
import { makeStyles, useTheme } from "@/theme";
import {
  addReviewComment,
  deleteReviewComment,
} from "@/utils/reviewCommentUpdates";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";

export interface ProfileBodyProps {
  /** Which tab the header's segmented control is on. */
  activeTab: ProfileContentTab;
  /** The identity block and tabs; scrolls away with the content. */
  header: React.ReactElement;

  reviews: Review[];
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  loadingReviews: boolean;
  refreshingReviews: boolean;
  onRefreshReviews: () => void;
  onLoadMoreReviews?: () => void;
  emptyReviews: React.ReactElement | null;

  regularPlaces: ProfileRegularPlace[];
  loadingRegulars: boolean;
  onRefreshRegulars: () => void;
  emptyRegulars: React.ReactElement | null;

  /** Drives the header crossfade — whichever list is showing reports it. */
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;

  /** Own-profile only: the expanded card gets delete and edit. */
  canDelete?: boolean;
  onDelete?: (review: Review) => void;
  onEdit?: (review: Review) => void;
}

/**
 * Everything below a profile's identity block: the review grid or the
 * regulars list, and the comments sheet either can open.
 *
 * Both profile screens — your own and someone else's — render this. They had
 * a copy each, and the copies had drifted: the own-profile one never wired up
 * comment handling at all, so opening a review from your own grid gave you a
 * comment button that did nothing.
 */
const ProfileBody: React.FC<ProfileBodyProps> = ({
  activeTab,
  header,
  reviews,
  setReviews,
  loadingReviews,
  refreshingReviews,
  onRefreshReviews,
  onLoadMoreReviews,
  emptyReviews,
  regularPlaces,
  loadingRegulars,
  onRefreshRegulars,
  emptyRegulars,
  onScroll,
  canDelete = false,
  onDelete,
  onEdit,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  // The native tab bar floats over content, so the list pads its own tail.
  const tabBarInset = useNativeTabBarContentInset();
  // The patch is read by the row on its next render; see useComments in
  // ReviewItem, which applies it idempotently.
  const handleCommentAdded = useCallback(
    (reviewId: string, newComment: any) => {
      setReviews((prev) =>
        prev.map((r) =>
          String(r.id) === String(reviewId)
            ? addReviewComment(r, newComment)
            : r
        )
      );
    },
    [setReviews]
  );

  const handleCommentDeleted = useCallback(
    (reviewId: string, commentId: number) => {
      setReviews((prev) =>
        prev.map((r) =>
          String(r.id) === String(reviewId)
            ? deleteReviewComment(r, commentId)
            : r
        )
      );
    },
    [setReviews]
  );

  return (
    <>
      {activeTab === "reviews" ? (
        <ReviewGrid
          reviews={reviews}
          header={header}
          emptyComponent={emptyReviews}
          loading={loadingReviews}
          refreshing={refreshingReviews}
          onRefresh={onRefreshReviews}
          onEndReached={onLoadMoreReviews}
          onScroll={onScroll}
          canDelete={canDelete}
          onDelete={onDelete}
          onEdit={onEdit}
          onCommentAdded={handleCommentAdded}
          onCommentDeleted={handleCommentDeleted}
        />
      ) : (
        <FlatList
          data={regularPlaces}
          keyExtractor={(place) => String(place.location_id)}
          renderItem={({ item }) => <RegularPlaceRow place={item} />}
          ListHeaderComponent={header}
          ListHeaderComponentStyle={styles.regularsHeader}
          ListEmptyComponent={
            loadingRegulars ? (
              <View>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.skeletonRow}>
                    <Skeleton circle height={38} />
                    <View style={styles.skeletonContent}>
                      <Skeleton width="55%" height={13} />
                      <Skeleton width="35%" height={10} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              emptyRegulars
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={loadingRegulars}
              onRefresh={onRefreshRegulars}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: tabBarInset }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </>
  );
};

const useStyles = makeStyles((t) => ({
  regularsHeader: {
    paddingBottom: t.spacing.md,
  },
  skeletonRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.md,
  },
  skeletonContent: {
    flex: 1,
    gap: 6,
  },
}));

export default ProfileBody;
