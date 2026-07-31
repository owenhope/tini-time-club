import "react-native-get-random-values";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/utils/supabase";
import { decode } from "base64-arraybuffer";
import { useProfile } from "@/context/profile-context";
import { Ionicons } from "@expo/vector-icons";
import LikeSlider from "@/components/LikeSlider";
import { useRouter, useNavigation, useFocusEffect } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import { VerifiedName } from "@/components/shared";
import ProfileHeader from "@/components/ProfileHeader";
import ReviewGrid from "@/components/ReviewGrid";
import authCache from "@/utils/authCache";
import databaseService from "@/services/databaseService";
import AnalyticService from "@/services/analyticsService";
import { HIT_SLOP, makeStyles, useTheme } from "@/theme";
import ProfileContentTabs, {
  type ProfileContentTab,
} from "@/components/ProfileContentTabs";
import RegularPlaceRow from "@/components/RegularPlaceRow";
import FavoriteTags, { parseFavoriteIds } from "@/components/profile/FavoriteTags";
import FavoriteLocationLink from "@/components/profile/FavoriteLocationLink";
import { useProfileScreenData } from "@/hooks/useProfileScreenData";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";

const Profile = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const [avatar, setAvatar] = useState<string | null>(null);
  const { profile, updateProfile, refreshProfile } = useProfile();
  const router = useRouter();
  const navigation = useNavigation();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("reviews");
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
    loadFollowCounts,
  } = useProfileScreenData({
    profileId: profile?.id,
    viewerId: profile?.id,
    favoriteLocationId: profile?.favorite_location_id,
    reviewOptions: { limit: 50, offset: 0 },
  });

  useEffect(() => {
    if (profile?.avatar_url) {
      try {
        const publicUrl = supabase.storage
          .from("avatars")
          .getPublicUrl(profile.avatar_url).data.publicUrl;
        setAvatar(publicUrl);
        setAvatarError(null);
      } catch (error) {
        reportError("Error fetching avatar URL:", error);
        setAvatarError("Couldn't load your photo");
      }
    } else {
      // No avatar set yet — not an error, the placeholder initial is shown.
      setAvatar(null);
      setAvatarError(null);
    }
  }, [profile?.avatar_url]);

  useEffect(() => {
    if (profile) {
      navigation.setOptions({
        headerTitle: () => (
          <VerifiedName
            name={profile.username}
            isVerified={profile.is_verified}
            badgeSize={15}
            style={styles.headerTitleContainer}
            textStyle={styles.headerTitle}
          />
        ),
        headerLeft: () => null,
        headerRight: () => (
          <TouchableOpacity
            // navigation.navigate targets the sibling screen in this tab's
            // stack; expo-router's useNavigation() has no typed param list,
            // so the cast is unavoidable without switching to router.push
            // (which would change back behavior).
            onPress={() => navigation.navigate("settings" as never)}
            style={styles.headerButton}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Profile settings"
          >
            <Ionicons name="settings-outline" size={24} color={colors.text} />
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: colors.surface,
        },
        headerTintColor: colors.text,
      });
    }
  }, [profile, navigation, colors, styles]);

  // Focus-refresh staleness gate; pull-to-refresh bypasses it via isRefresh.
  const PROFILE_REFRESH_AFTER = 30 * 1000;
  const lastProfileLoadRef = useRef(0);

  const pickImage = async () => {
    try {
      // Clear any previous errors
      setAvatarError(null);
      setAvatarLoading(true);

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1, // raw image quality
      });

      if (!result.canceled) {
        const originalUri = result.assets[0].uri;

        // 👉 Resize and compress
        const manipResult = await ImageManipulator.manipulateAsync(
          originalUri,
          [{ resize: { width: 512 } }],
          { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
        );

        const compressedUri = manipResult.uri;

        const User = await authCache.getUser();
        if (!User) {
          setAvatarError("User not found");
          setAvatarLoading(false);
          return;
        }

        const base64 = await new File(compressedUri).base64();

        const uniqueId = uuidv4();
        const filePath = `${User.id}/avatar_${uniqueId}.jpg`;
        const contentType = "image/jpeg";

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), { contentType });

        if (uploadError) {
          reportError("Error uploading avatar:", uploadError);
          setAvatarError(`Upload failed: ${uploadError.message}`);
          setAvatarLoading(false);
          return;
        }

        // Delete old avatar if one exists
        if (profile?.avatar_url && profile.avatar_url !== filePath) {
          await supabase.storage.from("avatars").remove([profile.avatar_url]);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        if (!urlData?.publicUrl) {
          reportError("Error getting avatar public URL for", filePath);
          setAvatarError("Couldn't finish uploading your photo.");
          setAvatarLoading(false);
          return;
        }

        // Update profile with new avatar path using context
        const updateResult = await updateProfile({ avatar_url: filePath });

        if (updateResult.error) {
          reportError("Error updating profile:", updateResult.error);
          setAvatarError(
            `Profile update failed: ${
              updateResult.error.message || updateResult.error
            }`
          );
          setAvatarLoading(false);
          return;
        }

        // Force refresh profile from database
        await refreshProfile();

        // Clear review caches to ensure fresh avatar data in reviews
        await databaseService.clearReviewCaches();

        setAvatar(urlData.publicUrl);
        setAvatarError(null);
        setAvatarLoading(false);

        // Track avatar change event
        AnalyticService.capture("change_avatar", {});
      } else {
        setAvatarLoading(false);
      }
    } catch (err) {
      reportError("Unexpected error uploading avatar:", err);
      setAvatarError("Couldn't upload your photo. Please try again.");
      setAvatarLoading(false);
    }
  };

  const deleteReview = async (id: string) => {
    const { error } = await supabase
      .from("reviews")
      .update({ state: 3 })
      .eq("id", id);
    if (!error) {
      setUserReviews((prev) => prev.filter((r) => r.id !== id));
      // Track delete review event
      AnalyticService.capture("delete_review", { reviewId: id });
    }
  };

  const confirmDeleteReview = (id: string) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete your review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteReview(id),
        },
      ]
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyCtaIcon}>
        <Ionicons name="wine-outline" size={28} color={colors.accent} />
      </View>
      <Text style={styles.emptyCtaTitle}>Share your first Martini</Text>
      <TouchableOpacity
        style={styles.reviewLink}
        onPress={() => router.navigate(routes.review())}
        hitSlop={HIT_SLOP}
        accessibilityRole="link"
        accessibilityLabel="Write a review"
        accessibilityHint="Opens the new review form"
      >
        <Text style={styles.reviewLinkText}>Write a review</Text>
      </TouchableOpacity>
    </View>
  );

  // Load counts, reviews and regulars on focus (including first mount) —
  // but only when stale, so tab-hopping doesn't refire five queries every
  // time the user glances at their profile.
  useFocusEffect(
    React.useCallback(() => {
      if (!profile) return;

      const isStale =
        Date.now() - lastProfileLoadRef.current > PROFILE_REFRESH_AFTER;
      if (!isStale) return;
      lastProfileLoadRef.current = Date.now();

      loadFollowCounts();
      loadUserReviews();
      loadRegularPlaces();
      // The loaders intentionally excluded from deps: they are stable in
      // behavior and including them would re-run this on every render,
      // defeating the staleness gate.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profile])
  );

  const hasFavoriteTags =
    parseFavoriteIds(profile?.favorite_spirits).length > 0 ||
    parseFavoriteIds(profile?.favorite_types).length > 0;

  const favoriteTags = hasFavoriteTags ? (
    <FavoriteTags profile={profile} spirits={spirits} types={types} />
  ) : null;

  const favoriteChips = (
    <View style={styles.favoritesSection}>
      {!hasFavoriteTags && (
        <TouchableOpacity
          onPress={() => router.push(routes.editProfile())}
          style={styles.ctaContainer}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add your favorite spirits and types"
        >
          <Text style={styles.ctaText}>Add favorite spirits & types</Text>
        </TouchableOpacity>
      )}
      {!profile?.bio && (
        <TouchableOpacity
          onPress={() => router.push(routes.editProfile())}
          style={styles.ctaContainer}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add a bio to your profile"
        >
          <Text style={styles.ctaText}>Add a bio</Text>
        </TouchableOpacity>
      )}
      {favoriteLocation ? (
        <FavoriteLocationLink location={favoriteLocation} />
      ) : (
        <TouchableOpacity
          onPress={() =>
            router.push(
              routes.favoriteLocation({
                hasFavoriteLocation: "0",
                saveImmediately: "1",
              })
            )
          }
          style={styles.ctaContainer}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add a favorite location"
        >
          <Text style={styles.ctaText}>Add a favorite location</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // The header is the list header rather than a sibling, so the whole profile
  // scrolls away and the grid gets the full screen.
  const header = (
    <>
      <ProfileHeader
        profile={profile}
        reviewsCount={userReviews.length}
        followersCount={followersCount}
        followingCount={followingCount}
        isOwnProfile={true}
        onAvatarPress={pickImage}
        avatarLoading={avatarLoading}
        avatarError={avatarError}
        onFollowersPress={() =>
          profile?.username &&
          router.push(routes.followers(profile.username))
        }
        onFollowingPress={() =>
          profile?.username &&
          router.push(routes.following(profile.username))
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
          onRefresh={() => profile?.id && loadUserReviews(true)}
          canDelete={true}
          onDelete={(review) => confirmDeleteReview(review.id)}
          onEdit={(review) =>
            router.push(routes.editCaption(review.id))
          }
        />
      ) : (
        <FlatList
          data={regularPlaces}
          keyExtractor={(place) => String(place.location_id)}
          renderItem={({ item }) => <RegularPlaceRow place={item} />}
          ListHeaderComponent={header}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {loadingRegulars ? (
                <ActivityIndicator size="small" color={colors.accent} />
              ) : (
                <View style={styles.regularsEmptyContent}>
                  <View style={styles.emptyCtaIcon}>
                    <Ionicons
                      name="ribbon-outline"
                      size={28}
                      color={colors.accent}
                    />
                  </View>
                  <Text style={styles.regularsEmptyBody}>
                    Review the same place often to earn a spot among its top
                    three Regulars.
                  </Text>
                </View>
              )}
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={loadingRegulars}
              onRefresh={() => profile?.id && loadRegularPlaces()}
              colors={[colors.accent]}
              tintColor={colors.accent}
            />
          }
          contentContainerStyle={styles.regularsList}
          showsVerticalScrollIndicator={false}
        />
      )}

      {selectedReviewId && (
        <LikeSlider
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
        />
      )}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  ctaContainer: {
    width: "100%" as const,
    alignItems: "flex-start" as const,
    minHeight: 32,
    justifyContent: "center" as const,
  },
  favoritesSection: {
    paddingHorizontal: t.spacing.lg,
    gap: t.spacing.xs,
  },
  ctaText: {
    ...t.typography.body,
    color: t.colors.accent,
    fontWeight: "600" as const,
  },
  regularsList: {
    paddingBottom: t.spacing.xxl,
  },
  emptyContainer: {
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.xxl,
    gap: t.spacing.md,
  },
  emptyCtaIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentSubtle,
  },
  emptyCtaTitle: {
    ...t.typography.heading,
    color: t.colors.text,
    textAlign: "center" as const,
  },
  reviewLink: {
    minHeight: 44,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.sm,
  },
  reviewLinkText: {
    ...t.typography.bodyStrong,
    color: t.colors.accent,
  },
  regularsEmptyContent: {
    width: "100%" as const,
    maxWidth: 300,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingVertical: t.spacing.md,
  },
  regularsEmptyBody: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 22,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    marginRight: 2,
  },
  headerTitleContainer: { alignItems: "center" as const },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: t.colors.text,
  },
}));

export default Profile;
