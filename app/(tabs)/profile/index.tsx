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

const Profile = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const { profile } = useProfile();
  const router = useRouter();
  const navigation = useNavigation();
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.avatar_url) {
      try {
        const publicUrl = supabase.storage
          .from("avatars")
          .getPublicUrl(profile.avatar_url).data.publicUrl;
        setAvatar(publicUrl);
        console.log("Avatar URL:", publicUrl);
      } catch (error) {
        console.error("Error fetching avatar URL:", error);
      }
    } else {
      setAvatar(null);
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
            <Ionicons name="ellipsis-horizontal" size={24} color="black" />
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
      const { data: reviewsData, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          comment,
          image_url,
          inserted_at,
          taste,
          presentation,
          location:locations!reviews_location_fkey(name),
          spirit:spirit(name),
          type:type(name),
          profile:profiles!reviews_user_id_fkey1(id, username, avatar_url)
        `
        )
        .eq("user_id", userId)
        .eq("state", 1)
        .order("inserted_at", { ascending: false });

      const reviewsWithFullUrl = await Promise.all(
        (reviewsData || []).map(async (review: any) => {
          const { data, error } = await supabase.storage
            .from("review_images")
            .createSignedUrl(review.image_url, 60);
          if (error) {
            console.error("Error creating signed URL:", error);
            return review;
          }
          return { ...review, image_url: data.signedUrl };
        })
      );

      setUserReviews(reviewsWithFullUrl);
    } catch (err) {
      console.error("Unexpected error while fetching reviews:", err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
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

      const {
        data: { user: User },
      } = await supabase.auth.getUser();
      if (!User) return;

      const base64 = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: "base64",
      });

      const uniqueId = uuidv4();
      const filePath = `${User.id}/avatar_${uniqueId}.jpg`;
      const contentType = "image/jpeg";

      try {
        // Upload new avatar
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), { contentType });

        if (uploadError) {
          console.error("Error uploading avatar:", uploadError);
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
          return;
        }

        // Update profile with new avatar path
        await supabase
          .from("profiles")
          .update({ avatar_url: filePath })
          .eq("id", User.id);

        setAvatar(urlData.publicUrl);
      } catch (err) {
        console.error("Unexpected error uploading avatar:", err);
      }
    }
  };

  const handleLogout = async () => {
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
      onShowLikes={(id: string) => setSelectedReviewId(id)}
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

  // Refresh follow counts when the profile screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshFollowCounts = async () => {
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

      refreshFollowCounts();
    }, [profile])
  );

  return (
    <View style={styles.container}>
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          {avatar ? (
            <Image style={styles.avatar} source={{ uri: avatar }} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {profile?.username?.charAt(0).toUpperCase() || "?"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <Pressable
          style={styles.userInfoContainer}
          onPress={() => navigation.navigate("followers")}
        >
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userReviews.length}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followersCount}</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{followingCount}</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </Pressable>
      </View>

      <View style={styles.reviewsContainer}>
        <FlatList
          data={userReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          onRefresh={() => profile?.id && loadUserReviews(profile.id)}
          refreshing={loadingReviews}
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
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ccc",
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ccc",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "bold",
  },
  userInfoContainer: { flex: 1 },
  statsContainer: { flexDirection: "row", marginTop: 8 },
  statItem: { alignItems: "center", marginRight: 16 },
  statNumber: { fontSize: 16, fontWeight: "bold" },
  statLabel: { fontSize: 14, color: "#777" },
  reviewsContainer: { flex: 1 },
  gridContent: { paddingBottom: 20 },
  emptyContainer: { alignItems: "center", padding: 20 },
  emptyText: { fontSize: 16, color: "#555" },
  headerButton: { marginRight: 10 },
  headerTitleContainer: { alignItems: "center" },
  headerTitle: { fontSize: 20, fontWeight: "bold" },
});

export default Profile;
