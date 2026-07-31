import "react-native-get-random-values";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Animated,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/utils/supabase";
import { decode } from "base64-arraybuffer";
import { useProfile } from "@/context/profile-context";
import { Review } from "@/types/types";
import ReviewItem from "@/components/ReviewItem";
import { Ionicons } from "@expo/vector-icons";
import LikeSlider from "@/components/LikeSlider";
import { useRouter, useNavigation } from "expo-router";
import { useFocusEffect } from "expo-router";
import { v4 as uuidv4 } from "uuid";
import imageCache from "@/utils/imageCache";
import { Avatar, VerifiedName } from "@/components/shared";
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
import {
  getProfileRegularPlaces,
  type ProfileRegularPlace,
} from "@/services/regularsService";
import type { FavoriteLocationValue } from "@/services/favoriteLocationSelection";

const Profile = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [refreshingReviews, setRefreshingReviews] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const { profile, updateProfile, refreshProfile } = useProfile();
  const router = useRouter();
  const navigation = useNavigation();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [avatarLoading, setAvatarLoading] = useState<boolean>(false);
  const [spirits, setSpirits] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<ProfileContentTab>("reviews");
  const [regularPlaces, setRegularPlaces] = useState<ProfileRegularPlace[]>([]);
  const [loadingRegulars, setLoadingRegulars] = useState(false);
  const [favoriteLocation, setFavoriteLocation] =
    useState<FavoriteLocationValue | null>(null);

  useEffect(() => {
    if (profile?.avatar_url) {
      try {
        const publicUrl = supabase.storage
          .from("avatars")
          .getPublicUrl(profile.avatar_url).data.publicUrl;
        setAvatar(publicUrl);
        setAvatarError(null);
      } catch (error) {
        console.error("Error fetching avatar URL:", error);
        setAvatarError("Couldn't load your photo");
      }
    } else {
      // No avatar set yet — not an error, the placeholder initial is shown.
      setAvatar(null);
      setAvatarError(null);
    }
  }, [profile?.avatar_url]);

  useEffect(() => {
    const fetchFollowCounts = async () => {
      if (!profile) return;
      const { count: followers } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id);

      const { count: following } = await supabase
        .from("followers")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id);

      setFollowersCount(followers || 0);
      setFollowingCount(following || 0);
    };

    fetchFollowCounts();
  }, [profile]);

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
        // Without the viewer id the server computes has_liked for nobody and
        // your own liked reviews render with unlit hearts.
        currentUserId: profile?.id,
        limit: 50,
        offset: 0,
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
      console.error("Unexpected error while fetching reviews:", err);
    } finally {
      if (isRefresh) {
        setRefreshingReviews(false);
      } else {
        setLoadingReviews(false);
      }
    }
  };

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
          console.error("Error uploading avatar:", uploadError);
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
          console.error("Error getting avatar public URL for", filePath);
          setAvatarError("Couldn't finish uploading your photo.");
          setAvatarLoading(false);
          return;
        }

        // Update profile with new avatar path using context
        const updateResult = await updateProfile({ avatar_url: filePath });

        if (updateResult.error) {
          console.error("Error updating profile:", updateResult.error);
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
      console.error("Unexpected error uploading avatar:", err);
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
        onPress={() => router.navigate("/review")}
        hitSlop={HIT_SLOP}
        accessibilityRole="link"
        accessibilityLabel="Write a review"
        accessibilityHint="Opens the new review form"
      >
        <Text style={styles.reviewLinkText}>Write a review</Text>
      </TouchableOpacity>
    </View>
  );

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

  const loadRegularPlaces = async (profileId: string) => {
    setLoadingRegulars(true);
    try {
      setRegularPlaces(await getProfileRegularPlaces(profileId));
    } catch (error) {
      console.error("Error loading regular places:", error);
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
      console.error("Error loading favorite location:", error);
      setFavoriteLocation(null);
      return;
    }
    setFavoriteLocation(data);
  };

  useEffect(() => {
    if (profile?.id) {
      loadUserReviews(profile.id);
      loadRegularPlaces(profile.id);
    }
    loadFavoriteLocation(profile?.favorite_location_id);
    loadSpiritsAndTypes();
  }, [profile]);

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
    if (!profile?.favorite_spirits) return [];
    if (Array.isArray(profile.favorite_spirits))
      return profile.favorite_spirits;
    try {
      return JSON.parse(profile.favorite_spirits);
    } catch {
      return [];
    }
  };

  const getFavoriteTypes = () => {
    if (!profile?.favorite_types) return [];
    if (Array.isArray(profile.favorite_types)) return profile.favorite_types;
    try {
      return JSON.parse(profile.favorite_types);
    } catch {
      return [];
    }
  };

  // Refresh follow counts and reviews when the profile screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshData = async () => {
        if (!profile) return;

        // Refresh follow counts
        const { count: followers } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profile.id);

        const { count: following } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profile.id);

        setFollowersCount(followers || 0);
        setFollowingCount(following || 0);

        // Refresh reviews
        loadUserReviews(profile.id);
        loadRegularPlaces(profile.id);
        loadFavoriteLocation(profile.favorite_location_id);
      };

      refreshData();
    }, [profile])
  );

  const hasFavoriteTags =
    getFavoriteSpirits().length > 0 || getFavoriteTypes().length > 0;

  const favoriteTags = hasFavoriteTags ? (
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

  const favoriteChips = (
    <View style={styles.favoritesSection}>
      {!hasFavoriteTags && (
        <TouchableOpacity
          onPress={() => router.push("/edit-profile")}
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
          onPress={() => router.push("/edit-profile")}
          style={styles.ctaContainer}
          hitSlop={6}
          accessibilityRole="button"
          accessibilityLabel="Add a bio to your profile"
        >
          <Text style={styles.ctaText}>Add a bio</Text>
        </TouchableOpacity>
      )}
      {favoriteLocation ? (
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
      ) : (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: "/favorite-location",
              params: {
                hasFavoriteLocation: "0",
                saveImmediately: "1",
              },
            })
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
          router.push(`/users/${profile.username}/followers`)
        }
        onFollowingPress={() =>
          profile?.username &&
          router.push(`/users/${profile.username}/following`)
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
          onRefresh={() => profile?.id && loadUserReviews(profile.id, true)}
          canDelete={true}
          onDelete={(review) => confirmDeleteReview(review.id)}
          onEdit={(review) =>
            router.push(`/edit-caption?reviewId=${review.id}`)
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
              onRefresh={() => profile?.id && loadRegularPlaces(profile.id)}
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
  bioCtaContainer: {
    width: "100%" as const,
    alignItems: "flex-start" as const,
  },
  tagsSection: {
    paddingHorizontal: t.spacing.lg,
    paddingTop: t.spacing.xs,
    paddingBottom: t.spacing.lg,
  },
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
  ctaText: {
    ...t.typography.body,
    color: t.colors.accent,
    fontWeight: "600" as const,
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
  reviewsContainer: { flex: 1 },
  gridContent: { paddingBottom: 20 },
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
