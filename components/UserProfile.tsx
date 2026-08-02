import React, { useState, useEffect } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  ActionSheetIOS,
  RefreshControl,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import { Profile, Review } from "@/types/types";
import ReviewGrid from "@/components/ReviewGrid";
import CommentsSlider from "@/components/CommentsSlider";
import ProfileHeader from "@/components/ProfileHeader";
import { Button, Skeleton, VerifiedName } from "@/components/shared";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";
import * as Haptics from "expo-haptics";
import AnalyticService from "@/services/analyticsService";
import { HIT_SLOP, fonts, makeStyles, useTheme } from "@/theme";
import ProfileContentTabs, {
  type ProfileContentTab,
} from "@/components/ProfileContentTabs";
import RegularPlaceRow from "@/components/RegularPlaceRow";
import FavoriteTags, {
  parseFavoriteIds,
} from "@/components/profile/FavoriteTags";
import FavoriteLocationLink from "@/components/profile/FavoriteLocationLink";
import { useProfileScreenData } from "@/hooks/useProfileScreenData";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";

const UserProfile = () => {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [doesFollow, setDoesFollow] = useState<boolean>(false);
  const [followPending, setFollowPending] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("reviews");

  const { profile } = useProfile(); // logged-in user data
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const usernameParam = params.username as string | undefined;

  // For this screen, we always show the other user's profile.
  const displayProfile = selectedProfile;

  const {
    userReviews,
    setUserReviews,
    loadingReviews,
    refreshingReviews,
    loadUserReviews,
    regularPlaces,
    loadingRegulars,
    loadRegularPlaces,
    favoriteLocation,
    spirits,
    types,
    followersCount,
    followingCount,
    setFollowersCount,
    loadFollowCounts,
  } = useProfileScreenData({
    profileId: displayProfile?.id,
    viewerId: profile?.id,
    favoriteLocationId: displayProfile?.favorite_location_id,
    // Don't exclude blocked users when viewing their profile.
    reviewOptions: { excludeBlocked: false },
  });

  // Check follow status for the selected user
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (displayProfile && profile) {
        const { data, error } = await supabase
          .from("followers")
          .select("*")
          .eq("follower_id", profile.id)
          .eq("following_id", displayProfile.id)
          .maybeSingle();
        if (error) {
          reportError("Error checking follow status:", error);
        } else {
          setDoesFollow(!!data);
        }
      }
    };
    checkFollowStatus();
  }, [displayProfile, profile]);

  // Check block status for the selected user
  useEffect(() => {
    const checkBlockStatus = async () => {
      if (displayProfile && profile) {
        const { data, error } = await supabase
          .from("blocks")
          .select("*")
          .eq("blocker_id", profile.id)
          .eq("blocked_id", displayProfile.id)
          .maybeSingle();
        if (error) {
          reportError("Error checking block status:", error);
        } else {
          setIsBlocked(!!data);
        }
      }
    };
    checkBlockStatus();
  }, [displayProfile, profile]);

  const toggleFollow = async () => {
    // followPending guards against double-taps, which would otherwise send two
    // writes and adjust the local count twice.
    if (!profile || !displayProfile || followPending) return;

    const wasFollowing = doesFollow;
    setFollowPending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Optimistic: the button reflects the new state immediately.
    setDoesFollow(!wasFollowing);
    setFollowersCount((prev) => Math.max(0, prev + (wasFollowing ? -1 : 1)));

    const { error } = wasFollowing
      ? await supabase
          .from("followers")
          .delete()
          .eq("follower_id", profile.id)
          .eq("following_id", displayProfile.id)
      : await supabase
          .from("followers")
          .upsert([
            { follower_id: profile.id, following_id: displayProfile.id },
          ]);

    if (error) {
      reportError(
        wasFollowing ? "Error unfollowing user:" : "Error following user:",
        error
      );
      setDoesFollow(wasFollowing);
      setFollowersCount((prev) => Math.max(0, prev + (wasFollowing ? 1 : -1)));
      Alert.alert(
        "Error",
        `Unable to ${wasFollowing ? "unfollow" : "follow"} user. Please try again.`
      );
    } else if (!wasFollowing) {
      AnalyticService.capture("follow_user", {
        targetUserId: displayProfile.id,
        targetUsername: displayProfile.username,
      });
    }

    setFollowPending(false);
  };

  // Fetch follower and following counts from the database
  useEffect(() => {
    if (displayProfile) {
      loadFollowCounts();
    }
  }, [displayProfile, loadFollowCounts]);

  // Update header with custom title
  useEffect(() => {
    if (displayProfile) {
      navigation.setOptions({
        headerTitle: () => (
          <VerifiedName
            name={displayProfile.username}
            isVerified={displayProfile.is_verified}
            badgeSize={15}
            style={styles.headerTitleContainer}
            textStyle={styles.headerTitle}
          />
        ),
        headerRight: () => (
          <View style={styles.headerActions}>
            <Button
              title={doesFollow ? "Following" : "Follow"}
              size="small"
              variant={doesFollow ? "tonal" : "primary"}
              loading={followPending}
              onPress={toggleFollow}
              accessibilityLabel={
                doesFollow
                  ? `Unfollow ${displayProfile.username}`
                  : `Follow ${displayProfile.username}`
              }
              style={styles.headerFollow}
            />
            <TouchableOpacity
              onPress={showProfileMenu}
              style={styles.headerIconButton}
              hitSlop={HIT_SLOP}
              accessibilityRole="button"
              accessibilityLabel={`More options for ${displayProfile.username}`}
            >
              <Ionicons
                name="ellipsis-horizontal"
                size={22}
                color={colors.text}
              />
            </TouchableOpacity>
          </View>
        ),
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      });
    }
  }, [
    displayProfile,
    navigation,
    colors,
    styles,
    doesFollow,
    followPending,
    isBlocked,
  ]);

  /**
   * Block lives behind the overflow menu rather than beside Follow: it is rare
   * and semi-destructive, and giving it equal billing invited mis-taps.
   */
  const showProfileMenu = () => {
    const blockLabel = isBlocked ? "Unblock" : "Block";
    const act = () => (isBlocked ? handleUnblockUser() : handleBlockUser());

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [blockLabel, "Cancel"],
          destructiveButtonIndex: isBlocked ? undefined : 0,
          cancelButtonIndex: 1,
          userInterfaceStyle: isDark ? "dark" : "light",
        },
        (index) => {
          if (index === 0) act();
        }
      );
      return;
    }

    Alert.alert(displayProfile?.username ?? "Profile", undefined, [
      {
        text: blockLabel,
        style: isBlocked ? "default" : "destructive",
        onPress: act,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  // Fetch the selected profile when usernameParam is provided
  useEffect(() => {
    if (usernameParam) {
      fetchSelectedProfile(usernameParam);
    }
  }, [usernameParam]);

  const fetchSelectedProfile = async (username: string) => {
    setProfileError(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .eq("deleted", false)
        .single();
      if (error) {
        reportError("Error fetching selected profile:", error);
        // Without this the screen stays blank forever with no way back.
        setProfileError(
          error.code === "PGRST116"
            ? "This profile isn't available."
            : "We couldn't load this profile."
        );
      } else {
        setSelectedProfile(data);
        // Track view profile event (only if not viewing own profile)
        if (profile && data.id !== profile.id) {
          AnalyticService.capture("view_profile", {
            targetUserId: data.id,
            targetUsername: data.username,
          });
        }
      }
    } catch (err) {
      reportError("Unexpected error fetching profile:", err);
      setProfileError("We couldn't load this profile.");
    }
  };

  const handleShowComments = (
    reviewId: string,
    onCommentAdded: any,
    onCommentDeleted: any
  ) => {
    const review = userReviews.find((r) => r.id === reviewId);
    if (review) {
      setSelectedCommentReview(review);
    }
  };

  const handleCommentAdded = (reviewId: string, newComment: any) => {
    setUserReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, _commentPatch: { action: "add", data: newComment } }
          : r
      )
    );
  };

  const handleCommentDeleted = (reviewId: string, commentId: number) => {
    setUserReviews((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? { ...r, _commentPatch: { action: "delete", id: commentId } }
          : r
      )
    );
  };

  const handleBlockUser = async () => {
    if (!profile || !displayProfile) return;

    Alert.alert(
      "Block User",
      `Are you sure you want to block ${displayProfile.username}? You won't see their content and they won't be able to see yours.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              // Insert block record
              const { error } = await supabase.from("blocks").insert([
                {
                  blocker_id: profile.id,
                  blocked_id: displayProfile.id,
                },
              ]);

              if (error) {
                reportError("Error blocking user:", error);
                Alert.alert("Error", "Unable to block user. Please try again.");
                return;
              }

              // Also unfollow if currently following
              if (doesFollow) {
                await supabase
                  .from("followers")
                  .delete()
                  .eq("follower_id", profile.id)
                  .eq("following_id", displayProfile.id);
                setDoesFollow(false);
              }

              setIsBlocked(true);
            } catch (err) {
              reportError("Unexpected error blocking user:", err);
              Alert.alert(
                "Error",
                "An unexpected error occurred. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const handleUnblockUser = async () => {
    if (!profile || !displayProfile) return;

    Alert.alert(
      "Unblock User",
      `Are you sure you want to unblock ${displayProfile.username}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("blocks")
                .delete()
                .eq("blocker_id", profile.id)
                .eq("blocked_id", displayProfile.id);

              if (error) {
                reportError("Error unblocking user:", error);
                Alert.alert(
                  "Error",
                  "Unable to unblock user. Please try again."
                );
                return;
              }

              setIsBlocked(false);
            } catch (err) {
              reportError("Unexpected error unblocking user:", err);
              Alert.alert(
                "Error",
                "An unexpected error occurred. Please try again."
              );
            }
          },
        },
      ]
    );
  };

  const renderEmpty = () => {
    if (loadingReviews) {
      return null; // Don't show empty state while loading
    }
    if (userReviews.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No reviews available.</Text>
        </View>
      );
    }
    return null;
  };

  useEffect(() => {
    if (displayProfile && displayProfile.id) {
      loadUserReviews();
      loadRegularPlaces();
    }
  }, [displayProfile, loadUserReviews, loadRegularPlaces]);

  if (profileError) {
    return (
      <View style={[styles.container, styles.errorState]}>
        <Text style={styles.errorTitle}>{profileError}</Text>
        <TouchableOpacity
          style={styles.errorButton}
          onPress={() => {
            if (usernameParam) fetchSelectedProfile(String(usernameParam));
          }}
        >
          <Text style={styles.errorButtonText}>Try again</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorLink}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasFavoriteTags =
    parseFavoriteIds(displayProfile?.favorite_spirits).length > 0 ||
    parseFavoriteIds(displayProfile?.favorite_types).length > 0;

  const favoriteTags = hasFavoriteTags ? (
    <FavoriteTags profile={displayProfile} spirits={spirits} types={types} />
  ) : null;

  const favoriteChips = favoriteLocation ? (
    <View style={styles.favoritesSection}>
      <FavoriteLocationLink location={favoriteLocation} />
    </View>
  ) : null;

  // Header scrolls with the grid rather than sitting fixed above it.
  const header = (
    <>
      <ProfileHeader
        profile={displayProfile}
        reviewsCount={userReviews.length}
        followersCount={followersCount}
        followingCount={followingCount}
        isOwnProfile={profile ? profile.id === displayProfile?.id : false}
        onFollowersPress={() =>
          displayProfile?.username &&
          router.push(routes.followers(displayProfile.username))
        }
        onFollowingPress={() =>
          displayProfile?.username &&
          router.push(routes.following(displayProfile.username))
        }
        tags={favoriteTags}
      >
        {favoriteChips}
      </ProfileHeader>
      <ProfileContentTabs activeTab={activeTab} onChange={setActiveTab} />
    </>
  );

  return (
    <View style={styles.container}>
      {activeTab === "reviews" ? (
        <ReviewGrid
          reviews={userReviews}
          header={header}
          emptyComponent={renderEmpty()}
          loading={loadingReviews}
          refreshing={refreshingReviews}
          onRefresh={() => {
            if (displayProfile?.id) loadUserReviews(true);
          }}
          onEdit={(review) =>
            profile && String(profile.id) === String(review.user_id)
              ? router.push(routes.editCaption(review.id))
              : undefined
          }
          onShowComments={handleShowComments}
          onCommentAdded={handleCommentAdded}
          onCommentDeleted={handleCommentDeleted}
        />
      ) : (
        <FlatList
          data={regularPlaces}
          keyExtractor={(place) => String(place.location_id)}
          renderItem={({ item }) => <RegularPlaceRow place={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            loadingRegulars ? (
              <View>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={styles.skeletonPlaceRow}>
                    <Skeleton circle height={38} />
                    <View style={styles.skeletonPlaceContent}>
                      <Skeleton width="55%" height={13} />
                      <Skeleton width="35%" height={10} />
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  This member is not a top-three regular anywhere yet.
                </Text>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={loadingRegulars}
              onRefresh={() => displayProfile?.id && loadRegularPlaces()}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={styles.regularsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedCommentReview && (
        <CommentsSlider
          review={selectedCommentReview}
          onClose={() => setSelectedCommentReview(null)}
          onCommentAdded={handleCommentAdded}
          onCommentDeleted={handleCommentDeleted}
        />
      )}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  errorState: {
    justifyContent: "center" as const,
    alignItems: "center" as const,
    padding: t.spacing.xl,
    gap: t.spacing.lg,
  },
  errorTitle: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
  },
  errorButton: {
    backgroundColor: t.colors.accent,
    paddingVertical: t.spacing.md,
    paddingHorizontal: 28,
    borderRadius: t.radius.xl,
  },
  errorButtonText: {
    color: t.colors.onAccent,
    fontFamily: fonts.bold,
    fontSize: 15,
  },
  errorLink: {
    color: t.colors.textSecondary,
    fontFamily: fonts.regular,
    fontSize: 13,
  },
  emptyContainer: {
    alignItems: "center" as const,
    padding: 20,
  },
  emptyText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    color: t.colors.textSecondary,
  },
  skeletonPlaceRow: {
    minHeight: 76,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  skeletonPlaceContent: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  headerTitleContainer: {
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: t.colors.text,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingRight: t.spacing.xs,
  },
  headerFollow: {
    paddingHorizontal: t.spacing.lg,
    minHeight: 36,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  favoritesSection: {
    paddingHorizontal: t.spacing.lg,
    gap: t.spacing.sm,
  },
  regularsList: {
    paddingBottom: t.spacing.xxl,
  },
}));

export default UserProfile;
