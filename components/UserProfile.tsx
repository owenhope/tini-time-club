import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Platform,
  ActionSheetIOS,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import { Profile } from "@/types/types";
import ProfileBody from "@/components/profile/ProfileBody";
import ProfileHeader from "@/components/ProfileHeader";
import { Chip } from "@/components/shared";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import AnalyticService from "@/services/analyticsService";
import { useGoBack } from "@/hooks/useAppNavigation";
import AppHeader from "@/components/nav/AppHeader";
import useCollapsibleHeader from "@/hooks/useCollapsibleHeader";
import databaseService from "@/services/databaseService";
import { fonts, makeStyles, useTheme } from "@/theme";
import ProfileContentTabs, {
  type ProfileContentTab,
} from "@/components/ProfileContentTabs";
import FavoriteTags, {
  parseFavoriteIds,
} from "@/components/profile/FavoriteTags";
import FavoriteLocationLink from "@/components/profile/FavoriteLocationLink";
import { useProfileScreenData } from "@/hooks/useProfileScreenData";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";

const UserProfile = () => {
  const styles = useStyles();
  const { isDark } = useTheme();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [doesFollow, setDoesFollow] = useState<boolean>(false);
  const [followPending, setFollowPending] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isBlocked, setIsBlocked] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("reviews");

  const { profile } = useProfile(); // logged-in user data
  const router = useRouter();
  const goBack = useGoBack();
  // One value for both halves of the crossfade: header C fades out on it as
  // the identity block scrolls away, header B fades in on the same number.
  const {
    isCollapsed,
    progress,
    onScroll: handleScroll,
  } = useCollapsibleHeader();
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
    } else {
      // Reconcile both aggregates with the database after the optimistic
      // update. This also corrects the count if another relationship changed
      // while this profile was open.
      await loadFollowCounts();

      if (!wasFollowing) {
        AnalyticService.capture("follow_user", {
          targetUserId: displayProfile.id,
          targetUsername: displayProfile.username,
        });
      }
    }

    setFollowPending(false);
  };

  // Fetch follower and following counts from the database
  useEffect(() => {
    if (displayProfile) {
      loadFollowCounts();
    }
  }, [displayProfile, loadFollowCounts]);

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
              // Through the service, not straight to the table: it owns the
              // blocked-list cache the feed filters on.
              await databaseService.blockUser(profile.id, displayProfile.id);

              // Also unfollow if currently following
              if (doesFollow) {
                const { error: unfollowError } = await supabase
                  .from("followers")
                  .delete()
                  .eq("follower_id", profile.id)
                  .eq("following_id", displayProfile.id);
                if (unfollowError) {
                  reportError("Error unfollowing blocked user:", unfollowError);
                } else {
                  setDoesFollow(false);
                  setFollowersCount((prev) => Math.max(0, prev - 1));
                  await loadFollowCounts();
                }
              }

              setIsBlocked(true);
            } catch (err) {
              reportError("Error blocking user:", err);
              Alert.alert("Error", "Unable to block user. Please try again.");
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
              await databaseService.unblockUser(profile.id, displayProfile.id);
              setIsBlocked(false);
            } catch (err) {
              reportError("Error unblocking user:", err);
              Alert.alert("Error", "Unable to unblock user. Please try again.");
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
          <Text style={styles.emptyText}>Nothing poured here yet.</Text>
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
        <TouchableOpacity onPress={goBack}>
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
  const menuActions = [
    {
      icon: "ellipsis-horizontal" as const,
      onPress: showProfileMenu,
      accessibilityLabel: `More options for ${displayProfile?.username}`,
    },
  ];

  const header = (
    <>
      <ProfileHeader
        profile={displayProfile}
        variant="media"
        onBack={goBack}
        actions={menuActions}
        progress={progress}
        collapsed={isCollapsed}
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
        action={
          <Chip
            label={doesFollow ? "Following" : "Follow"}
            selected={!doesFollow}
            onInk={doesFollow}
            icon={doesFollow ? "checkmark" : undefined}
            disabled={followPending}
            onPress={toggleFollow}
            accessibilityLabel={
              doesFollow
                ? `Unfollow ${displayProfile?.username}`
                : `Follow ${displayProfile?.username}`
            }
          />
        }
      >
        {favoriteChips}
      </ProfileHeader>
      <ProfileContentTabs activeTab={activeTab} onChange={setActiveTab} />
    </>
  );

  return (
    <View style={styles.container}>
      <AppHeader
        variant="compact"
        title={displayProfile?.username ?? ""}
        preserveCase
        onBack={goBack}
        actions={menuActions}
        progress={progress}
        collapsed={isCollapsed}
        overlay
        statusBar={isCollapsed ? "auto" : "light"}
      />
      <ProfileBody
        activeTab={activeTab}
        header={header}
        onScroll={handleScroll}
        reviews={userReviews}
        setReviews={setUserReviews}
        loadingReviews={loadingReviews}
        refreshingReviews={refreshingReviews}
        onRefreshReviews={() => {
          if (displayProfile?.id) loadUserReviews(true);
        }}
        emptyReviews={renderEmpty()}
        regularPlaces={regularPlaces}
        loadingRegulars={loadingRegulars}
        onRefreshRegulars={() => displayProfile?.id && loadRegularPlaces()}
        emptyRegulars={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              No stool with their name on it — yet.
            </Text>
          </View>
        }
        onEdit={(review) =>
          profile && String(profile.id) === String(review.user_id)
            ? router.push(routes.editCaption(review.id))
            : undefined
        }
      />
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
    borderRadius: t.radius.pill,
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
  headerTitle: {
    fontSize: 20,
    fontFamily: fonts.bold,
    color: t.colors.onInk,
  },
  headerActions: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingRight: t.spacing.xs,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  // The header owns the screen gutter now, so its children sit flush.
  favoritesSection: {
    gap: t.spacing.sm,
  },
}));

export default UserProfile;
