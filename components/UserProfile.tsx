import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Image,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  Animated,
  Platform,
  ActionSheetIOS,
  RefreshControl,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import imageCache from "@/utils/imageCache";
import { Review } from "@/types/types";
import ReviewGrid from "@/components/ReviewGrid";
import CommentsSlider from "@/components/CommentsSlider";
import ProfileHeader from "@/components/ProfileHeader";
import { Button, Skeleton, VerifiedName } from "@/components/shared";
import { Ionicons } from "@expo/vector-icons";
import {
  useRouter,
  useLocalSearchParams,
  useNavigation,
  usePathname,
} from "expo-router";
import * as Haptics from "expo-haptics";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { makeStyles, useTheme, HIT_SLOP } from "@/theme";
import ProfileContentTabs, {
  type ProfileContentTab,
} from "@/components/ProfileContentTabs";
import RegularPlaceRow from "@/components/RegularPlaceRow";
import {
  getProfileRegularPlaces,
  type ProfileRegularPlace,
} from "@/services/regularsService";
import type { FavoriteLocationValue } from "@/services/favoriteLocationSelection";

interface ProfileType {
  id: string;
  username: string;
  name?: string | null;
  bio?: string | null;
  favorite_spirits?: any;
  favorite_types?: any;
  avatar_url?: string | null;
  is_verified?: boolean;
  favorite_location_id?: number | null;
}

const UserProfile = () => {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [refreshingReviews, setRefreshingReviews] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(
    null
  );
  const [doesFollow, setDoesFollow] = useState<boolean>(false);
  const [followPending, setFollowPending] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [spirits, setSpirits] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("reviews");
  const [regularPlaces, setRegularPlaces] = useState<ProfileRegularPlace[]>([]);
  const [loadingRegulars, setLoadingRegulars] = useState(true);
  const [favoriteLocation, setFavoriteLocation] =
    useState<FavoriteLocationValue | null>(null);

  const { profile } = useProfile(); // logged-in user data
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const params = useLocalSearchParams();
  const usernameParam = params.username as string | undefined;

  // For this screen, we always show the other user's profile.
  const displayProfile = selectedProfile;

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
          console.error("Error checking follow status:", error);
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
          console.error("Error checking block status:", error);
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
      console.error(
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
    const fetchFollowCounts = async () => {
      if (displayProfile) {
        const { count: followers, error: errorFollowers } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", displayProfile.id);
        if (errorFollowers) {
          console.error("Error fetching followers count:", errorFollowers);
        } else {
          setFollowersCount(followers || 0);
        }
        const { count: following, error: errorFollowing } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", displayProfile.id);
        if (errorFollowing) {
          console.error("Error fetching following count:", errorFollowing);
        } else {
          setFollowingCount(following || 0);
        }
      }
    };

    fetchFollowCounts();
  }, [displayProfile]);

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
        console.error("Error fetching selected profile:", error);
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
      console.error("Unexpected error fetching profile:", err);
      setProfileError("We couldn't load this profile.");
    }
  };

  const loadUserReviews = async (userId?: string, isRefresh = false) => {
    if (isRefresh) {
      setRefreshingReviews(true);
    } else {
      setLoadingReviews(true);
    }
    if (!userId) {
      if (isRefresh) {
        setRefreshingReviews(false);
      } else {
        setLoadingReviews(false);
      }
      return;
    }
    try {
      const reviewsData = await databaseService.getReviews({
        userId,
        // The signed-in user is the viewer: has_liked is computed for them,
        // not for the profile being viewed.
        currentUserId: profile?.id,
        excludeBlocked: false, // Don't exclude blocked users when viewing their profile
        forceRefresh: isRefresh,
      });

      // Get image URLs using cache
      const imagePaths = reviewsData.map((review: any) => review.image_url);
      const imageUrls = await imageCache.getReviewImageUrls(imagePaths);

      const reviewsWithFullUrl = reviewsData.map((review: any) => ({
        ...review,
        image_url: imageUrls[review.image_url] || review.image_url,
      }));
      setUserReviews(reviewsWithFullUrl);
    } catch (err) {
      console.error("Unexpected error while fetching user reviews:", err);
    } finally {
      if (isRefresh) {
        setRefreshingReviews(false);
      } else {
        setLoadingReviews(false);
      }
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
                console.error("Error blocking user:", error);
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
              console.error("Unexpected error blocking user:", err);
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
                console.error("Error unblocking user:", error);
                Alert.alert(
                  "Error",
                  "Unable to unblock user. Please try again."
                );
                return;
              }

              setIsBlocked(false);
            } catch (err) {
              console.error("Unexpected error unblocking user:", err);
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

  const loadRegularPlaces = async (profileId: string) => {
    setLoadingRegulars(true);
    try {
      setRegularPlaces(await getProfileRegularPlaces(profileId));
    } catch (error) {
      console.error("Error loading profile regular places:", error);
      setRegularPlaces([]);
    } finally {
      setLoadingRegulars(false);
    }
  };

  const loadFavoriteLocation = async (locationId?: number | null) => {
    if (!locationId) {
      setFavoriteLocation(null);
      return;
    }

    const { data, error } = await supabase
      .from("locations")
      .select("id, name, address")
      .eq("id", locationId)
      .maybeSingle();

    if (error) {
      console.error("Error loading profile favorite location:", error);
      setFavoriteLocation(null);
      return;
    }
    setFavoriteLocation(data);
  };

  useEffect(() => {
    if (displayProfile && displayProfile.id) {
      loadUserReviews(displayProfile.id);
      loadRegularPlaces(displayProfile.id);
      loadFavoriteLocation(displayProfile.favorite_location_id);
    }
  }, [displayProfile]);

  // Load spirits and types for favorites display
  useEffect(() => {
    loadSpiritsAndTypes();
  }, []);

  const loadSpiritsAndTypes = async () => {
    try {
      const [spiritsData, typesData] = await Promise.all([
        databaseService.getSpirits(),
        databaseService.getTypes(),
      ]);
      setSpirits(spiritsData);
      setTypes(typesData);
    } catch (error) {
      console.error("Error loading spirits and types:", error);
    }
  };

  const getSpiritName = (id: number | string) => {
    const spirit = spirits.find((s) => String(s.id) === String(id));
    return spirit?.name || String(id);
  };

  const getTypeName = (id: number | string) => {
    const type = types.find((t) => String(t.id) === String(id));
    return type?.name || String(id);
  };

  // Helper to get favorite arrays (handle both array and JSON string)
  const getFavoriteSpirits = () => {
    if (!displayProfile?.favorite_spirits) return [];
    if (Array.isArray(displayProfile.favorite_spirits))
      return displayProfile.favorite_spirits;
    try {
      return JSON.parse(displayProfile.favorite_spirits);
    } catch {
      return [];
    }
  };

  const getFavoriteTypes = () => {
    if (!displayProfile?.favorite_types) return [];
    if (Array.isArray(displayProfile.favorite_types))
      return displayProfile.favorite_types;
    try {
      return JSON.parse(displayProfile.favorite_types);
    } catch {
      return [];
    }
  };

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

  const favoriteTags =
    getFavoriteSpirits().length > 0 || getFavoriteTypes().length > 0 ? (
      <View style={styles.favoritesTagsBlock}>
        {getFavoriteSpirits().length > 0 && (
          <View style={styles.favoritesTagsGroup}>
            <Text style={styles.favoritesLabel}>Spirit</Text>
            <View style={styles.favoritesTagsContainer}>
              {getFavoriteSpirits().map((spiritId: any) => (
                <View key={`spirit-${spiritId}`} style={styles.tag}>
                  <Text style={styles.tagText}>{getSpiritName(spiritId)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {getFavoriteTypes().length > 0 && (
          <View style={styles.favoritesTagsGroup}>
            <Text style={styles.favoritesLabel}>Type</Text>
            <View style={styles.favoritesTagsContainer}>
              {getFavoriteTypes().map((typeId: any) => (
                <View key={`type-${typeId}`} style={styles.tag}>
                  <Text style={styles.tagText}>{getTypeName(typeId)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    ) : null;

  const favoriteChips = favoriteLocation ? (
    <View style={styles.favoritesSection}>
      <View style={styles.favoriteLocationBlock}>
        <Text style={styles.favoritesLabel}>Favorite Location</Text>
        <TouchableOpacity
          onPress={() => router.push(`/places/${favoriteLocation.id}`)}
          style={styles.favoriteLocationLink}
          accessibilityRole="link"
          accessibilityLabel={`Favorite location, ${favoriteLocation.name}`}
        >
          <Ionicons name="location" size={16} color={colors.accent} />
          <Text style={styles.favoriteLocationText} numberOfLines={1}>
            {favoriteLocation.name}
          </Text>
        </TouchableOpacity>
      </View>
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
        doesFollow={doesFollow}
        followPending={followPending}
        isBlocked={isBlocked}
        onFollowPress={toggleFollow}
        onBlockPress={handleBlockUser}
        onUnblockPress={handleUnblockUser}
        onFollowersPress={() => router.push(`${pathname}/followers` as never)}
        onFollowingPress={() => router.push(`${pathname}/following` as never)}
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
            if (displayProfile?.id) loadUserReviews(displayProfile.id, true);
          }}
          onEdit={(review) =>
            profile && String(profile.id) === String(review.user_id)
              ? router.push(`/edit-caption?reviewId=${review.id}`)
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
              onRefresh={() =>
                displayProfile?.id && loadRegularPlaces(displayProfile.id)
              }
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
    fontWeight: "700" as const,
    fontSize: 15,
  },
  errorLink: {
    color: t.colors.textSecondary,
    fontSize: 13,
  },
  reviewsContainer: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center" as const,
    padding: 20,
  },
  emptyText: {
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
  headerButton: {
    marginRight: 10,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  },
  friendText: {
    fontSize: 15,
    color: t.colors.onAccent, // Text on the lavender fill
    fontWeight: "600" as const,
  },
  headerTitleContainer: {
    alignItems: "center" as const,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: t.colors.text,
  },
  headerSubtitle: {
    fontSize: 12,
    color: t.colors.textMuted,
  },
  bioSection: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.xs,
  },
  bio: {
    fontSize: 13,
    color: t.colors.text,
    lineHeight: 20,
    textAlign: "left" as const,
    fontWeight: "600" as const,
    width: "100%" as const,
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
  favoritesSection: {
    paddingHorizontal: t.spacing.lg,
    gap: t.spacing.sm,
  },
  tagsSection: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.lg,
  },
  favoritesTagsBlock: {
    // One row always: the Spirit and Type groups sit side by side and their
    // chips wrap vertically within each group instead of stacking the groups.
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    alignItems: "flex-start" as const,
    gap: t.spacing.lg,
  },
  favoritesTagsGroup: {
    flexShrink: 1,
    alignItems: "flex-start" as const,
    gap: 6,
  },
  favoritesLabel: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  favoriteLocationBlock: {
    // The link centres its text in a 32pt touch target, which already adds
    // ~6pt of visual space below the label — no extra gap on top of that.
    gap: 0,
  },
  favoritesTagsContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: t.spacing.sm,
    justifyContent: "flex-end" as const,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.lg,
    backgroundColor: t.colors.accent,
  },
  tagText: {
    fontSize: 12,
    color: t.colors.onAccent,
    textTransform: "capitalize" as const,
  },
  favoriteLocationLink: {
    minHeight: 32,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs,
  },
  favoriteLocationText: {
    ...t.typography.bodyStrong,
    color: t.colors.accent,
    flexShrink: 1,
  },
  regularsList: {
    paddingBottom: t.spacing.xxl,
  },
}));

export default UserProfile;
