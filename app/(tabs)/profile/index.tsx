import "react-native-get-random-values";
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
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
import { useFocusEffect } from "@react-navigation/native";
import { v4 as uuidv4 } from "uuid";
import imageCache from "@/utils/imageCache";
import { Avatar } from "@/components/shared";
import ProfileHeader from "@/components/ProfileHeader";
import authCache from "@/utils/authCache";
import databaseService from "@/services/databaseService";
import AnalyticService from "@/services/analyticsService";

const Profile = () => {
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
        setAvatarError(`Avatar URL error: ${error.message || error}`);
      }
    } else {
      setAvatar(null);
      setAvatarError("No avatar_url in profile");
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
            <Ionicons name="settings-outline" size={24} color="black" />
          </TouchableOpacity>
        ),
        headerStyle: {
          backgroundColor: "#f0f0f0",
        },
      });
    }
  }, [profile, navigation]);

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
        const { data: urlData, error: urlError } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        if (urlError || !urlData?.publicUrl) {
          console.error("Error getting avatar public URL:", urlError);
          setAvatarError(
            `URL generation failed: ${urlError?.message || "Unknown error"}`
          );
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
      setAvatarError(`Unexpected error: ${err.message || err}`);
      setAvatarLoading(false);
    }
  };

  const deleteReview = async (id: number) => {
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

  const confirmDeleteReview = (id: number) => {
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

  const renderReviewItem = ({ item }: { item: Review }) => (
    <ReviewItem
      review={item}
      canDelete={true}
      onDelete={() => confirmDeleteReview(item.id)}
      onEdit={() => router.push(`/profile/edit-caption?reviewId=${item.id}`)}
      onShowLikes={(id: string) => setSelectedReviewId(id)}
      onShowComments={() => {}}
      onCommentAdded={() => {}}
      onCommentDeleted={() => {}}
    />
  );

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

  return (
    <View style={styles.container}>
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
          navigation.navigate("follow-list", { type: "followers" })
        }
        onFollowingPress={() =>
          navigation.navigate("follow-list", { type: "following" })
        }
        isScrolled={isScrolled}
        hasBioOrFavs={
          !!(
            profile?.bio ||
            getFavoriteSpirits().length > 0 ||
            getFavoriteTypes().length > 0
          )
        }
      />

      <Animated.View
        style={{
          opacity: bioOpacity,
          height: isScrolled ? 0 : undefined,
          overflow: "hidden",
        }}
        pointerEvents={isScrolled ? "none" : "auto"}
      >
        <View style={styles.bioSection}>
          {profile?.bio ? (
            <Text style={styles.bio}>{profile.bio}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/profile/edit-profile")}
              style={styles.bioCtaContainer}
            >
              <Text
                style={[
                  styles.ctaText,
                  { textAlign: "left", marginTop: 4, width: "100%" },
                ]}
              >
                Add a bio
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tagsSection}>
          {getFavoriteSpirits().length > 0 || getFavoriteTypes().length > 0 ? (
            <View style={styles.favoritesTagsContainer}>
              {getFavoriteSpirits().map((spiritId: any) => {
                return (
                  <View key={`spirit-${spiritId}`} style={styles.tag}>
                    <Text style={styles.tagText}>
                      {getSpiritName(spiritId)}
                    </Text>
                  </View>
                );
              })}
              {getFavoriteTypes().map((typeId: any) => {
                return (
                  <View key={`type-${typeId}`} style={styles.tag}>
                    <Text style={styles.tagText}>{getTypeName(typeId)}</Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => router.push("/profile/edit-profile")}
              style={styles.ctaContainer}
            >
              <Text
                style={[styles.ctaText, { textAlign: "left", marginTop: 6 }]}
              >
                Add favorite spirits & types
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      <View style={styles.reviewsContainer}>
        <FlatList
          data={userReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={loadingReviews}
              onRefresh={() => profile?.id && loadUserReviews(profile.id)}
              colors={["#B6A3E2"]}
              tintColor="#B6A3E2"
            />
          }
        />
      </View>

      {selectedReviewId && (
        <LikeSlider
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  bioSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 4,
  },
  bio: {
    fontSize: 14,
    color: "#000",
    lineHeight: 20,
    textAlign: "left",
    fontWeight: "600",
    width: "100%",
  },
  bioCtaContainer: {
    width: "100%",
    alignItems: "flex-start",
  },
  tagsSection: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  ctaContainer: {
    width: "100%",
    alignItems: "flex-start",
  },
  favoritesTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    width: "100%",
    justifyContent: "flex-start",
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "#B6A3E2",
  },
  tagText: {
    fontSize: 12,
    color: "#fff",
    textTransform: "capitalize",
  },
  reviewsContainer: { flex: 1 },
  gridContent: { paddingBottom: 20 },
  emptyContainer: { alignItems: "center", padding: 20 },
  emptyText: { fontSize: 16, color: "#555" },
  headerButton: { marginRight: 10 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
});

export default Profile;
