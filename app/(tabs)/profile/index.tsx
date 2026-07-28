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
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
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
import { Avatar } from "@/components/shared";
import ProfileHeader from "@/components/ProfileHeader";
import ReviewGrid from "@/components/ReviewGrid";
import authCache from "@/utils/authCache";
import databaseService from "@/services/databaseService";
import AnalyticService from "@/services/analyticsService";
import { makeStyles, useTheme } from "@/theme";

const Profile = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
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
  const [isScrolled, setIsScrolled] = useState<boolean>(false);
  const scrollY = useRef(new Animated.Value(0)).current;
  const bioOpacity = useRef(new Animated.Value(1)).current;

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
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{profile.username}</Text>
          </View>
        ),
        headerLeft: () => null,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate("settings" as never)}
            style={styles.headerButton}
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

  const loadUserReviews = async (userId?: string) => {
    setLoadingReviews(true);
    if (!userId) {
      setLoadingReviews(false);
      return;
    }
    try {
      const reviewsData = await databaseService.getReviews({
        userId,
        limit: 50,
        offset: 0,
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
      setLoadingReviews(false);
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

        const base64 = await FileSystem.readAsStringAsync(compressedUri, {
          encoding: "base64",
        });

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
      <Text style={styles.emptyText}>No reviews available.</Text>
    </View>
  );

  useEffect(() => {
    if (profile?.id) loadUserReviews(profile.id);
    loadSpiritsAndTypes();
  }, [profile]);

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
      };

      refreshData();
    }, [profile])
  );

  useEffect(() => {
    Animated.timing(bioOpacity, {
      toValue: isScrolled ? 0 : 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [isScrolled]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: false,
      listener: (event: any) => {
        const offsetY = event.nativeEvent.contentOffset.y;
        const shouldBeScrolled = offsetY > 50;
        if (shouldBeScrolled !== isScrolled) {
          setIsScrolled(shouldBeScrolled);
        }
      },
    }
  );

  const favoriteChips = (
    <View style={styles.favoritesSection}>
      {getFavoriteSpirits().length > 0 || getFavoriteTypes().length > 0 ? (
        <View style={styles.favoritesTagsContainer}>
          {getFavoriteSpirits().map((spiritId: any) => (
            <View key={`spirit-${spiritId}`} style={styles.tag}>
              <Text style={styles.tagText}>{getSpiritName(spiritId)}</Text>
            </View>
          ))}
          {getFavoriteTypes().map((typeId: any) => (
            <View key={`type-${typeId}`} style={styles.tag}>
              <Text style={styles.tagText}>{getTypeName(typeId)}</Text>
            </View>
          ))}
        </View>
      ) : (
        <TouchableOpacity
          onPress={() => router.push("/profile/edit-profile")}
          style={styles.ctaContainer}
          accessibilityRole="button"
          accessibilityLabel="Add your favorite spirits and types"
        >
          <Text style={styles.ctaText}>Add favorite spirits & types</Text>
        </TouchableOpacity>
      )}
      {!profile?.bio && (
        <TouchableOpacity
          onPress={() => router.push("/profile/edit-profile")}
          style={styles.ctaContainer}
          accessibilityRole="button"
          accessibilityLabel="Add a bio to your profile"
        >
          <Text style={styles.ctaText}>Add a bio</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // The header is the list header rather than a sibling, so the whole profile
  // scrolls away and the grid gets the full screen.
  const header = (
    <ProfileHeader
      profile={profile}
      reviewsCount={userReviews.length}
      followersCount={followersCount}
      followingCount={followingCount}
      isOwnProfile={true}
      onAvatarPress={pickImage}
      avatarLoading={avatarLoading}
      avatarError={avatarError}
      onEditProfilePress={() => router.push("/profile/edit-profile")}
      onFollowersPress={() =>
        router.push("/profile/follow-list?type=followers")
      }
      onFollowingPress={() =>
        router.push("/profile/follow-list?type=following")
      }
    >
      {favoriteChips}
    </ProfileHeader>
  );

  return (
    <View style={styles.container}>
      <ReviewGrid
        reviews={userReviews}
        header={header}
        emptyComponent={renderEmpty()}
        refreshing={loadingReviews}
        onRefresh={() => profile?.id && loadUserReviews(profile.id)}
        onScroll={handleScroll}
        canDelete={true}
        onDelete={(review) => confirmDeleteReview(review.id)}
        onEdit={(review) =>
          router.push(`/profile/edit-caption?reviewId=${review.id}`)
        }
      />

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
    fontSize: 14,
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
    minHeight: 44,
    justifyContent: "center" as const,
  },
  favoritesSection: {
    paddingHorizontal: t.spacing.lg,
    gap: t.spacing.xs,
  },
  favoritesTagsContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: t.spacing.sm,
    width: "100%" as const,
    justifyContent: "flex-start" as const,
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
  reviewsContainer: { flex: 1 },
  gridContent: { paddingBottom: 20 },
  emptyContainer: { alignItems: "center" as const, padding: 20 },
  emptyText: { fontSize: 16, color: t.colors.textSecondary },
  headerButton: { marginRight: 10 },
  headerTitleContainer: { alignItems: "center" as const },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: t.colors.text,
  },
}));

export default Profile;
