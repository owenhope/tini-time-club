import "react-native-get-random-values";
import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
  Pressable,
  RefreshControl,
  ActivityIndicator,
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
        headerRight: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate("settings" as never)}
            style={styles.headerButton}
          >
            <Ionicons name="settings-outline" size={24} color="black" />
          </TouchableOpacity>
        ),
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
        AnalyticService.capture('change_avatar', {});
      } else {
        setAvatarLoading(false);
      }
    } catch (err) {
      console.error("Unexpected error uploading avatar:", err);
      setAvatarError(`Unexpected error: ${err.message || err}`);
      setAvatarLoading(false);
    }
  };

  const handleLogout = async () => {
    AnalyticService.capture('logout', {});
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      router.navigate("/");
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
      AnalyticService.capture('delete_review', { reviewId: id });
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
  }, [profile]);

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

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Avatar
              avatarPath={profile?.avatar_url}
              username={profile?.username}
              size={100}
              style={styles.avatar}
            />
            {avatarLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="small" color="#336654" />
              </View>
            )}
          </View>
          {avatarError && <Text style={styles.errorText}>{avatarError}</Text>}
        </TouchableOpacity>
        <View style={styles.userInfoContainer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userReviews.length}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                navigation.navigate("follow-list", { type: "followers" })
              }
            >
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.statItem}
              onPress={() =>
                navigation.navigate("follow-list", { type: "following" })
              }
            >
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.reviewsContainer}>
        <FlatList
          data={userReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
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
  profileHeader: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
  },
  avatarContainer: {
    marginRight: 16,
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    width: 100,
    height: 100,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfoContainer: { flex: 1 },
  statsContainer: {
    flexDirection: "row",
    marginTop: 8,
    justifyContent: "space-between",
  },
  statItem: { alignItems: "center", flex: 1 },
  statNumber: { fontSize: 16, fontWeight: "700" },
  statLabel: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    textAlign: "center",
  },
  reviewsContainer: { flex: 1 },
  gridContent: { paddingBottom: 20 },
  emptyContainer: { alignItems: "center", padding: 20 },
  emptyText: { fontSize: 16, color: "#555" },
  headerButton: { marginRight: 10 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
  errorText: {
    color: "#d32f2f",
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
  },
});

export default Profile;
