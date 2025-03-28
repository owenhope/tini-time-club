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
import LikeSlider from "@/components/LikeSlider"; // Adjust the path as necessary
import { useRouter, useNavigation } from "expo-router";
import { customEvent } from "vexo-analytics";

const Profile = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingAvatar, setLoadingAvatar] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

  const { profile } = useProfile();
  const router = useRouter();
  const navigation = useNavigation();

  // Always display the logged in user's profile.
  const displayProfile = profile;
  // State for the likes slider (controlled from Home)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  // Fetch follower and following counts for the logged in user.
  useEffect(() => {
    const fetchFollowCounts = async () => {
      if (profile) {
        const { count: followers, error: errorFollowers } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profile.id);
        if (errorFollowers) {
          console.error("Error fetching followers count:", errorFollowers);
        } else {
          setFollowersCount(followers || 0);
        }
        const { count: following, error: errorFollowing } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profile.id);
        if (errorFollowing) {
          console.error("Error fetching following count:", errorFollowing);
        } else {
          setFollowingCount(following || 0);
        }
      }
    };

    fetchFollowCounts();
  }, [profile]);

  // Update header with the user's username and a logout button.
  useEffect(() => {
    if (profile) {
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{profile.username}</Text>
          </View>
        ),
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={styles.headerButton}>
            <Ionicons name="log-out-outline" size={24} color="black" />
          </TouchableOpacity>
        ),
      });
    }
  }, [profile, navigation]);

  const loadUserAvatar = async (userId?: string) => {
    setLoadingAvatar(true);
    if (!userId) {
      setLoadingAvatar(false);
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(`${userId}/avatar.jpg`);
      if (error) {
        if (
          error.message.includes("400") ||
          error.message.includes("The resource was not found")
        ) {
          setAvatar(null);
          setLoadingAvatar(false);
          return;
        }
        console.error("Avatar download error:", error);
        setLoadingAvatar(false);
        return;
      }
      if (data) {
        const fr = new FileReader();
        fr.readAsDataURL(data);
        fr.onload = () => {
          setAvatar(fr.result as string);
          setLoadingAvatar(false);
        };
      }
    } catch (err) {
      console.error("Unexpected error while downloading avatar:", err);
      setLoadingAvatar(false);
    }
  };

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
          profile:profiles!reviews_user_id_fkey1(username)
          `
        )
        .eq("user_id", userId)
        .eq("state", 1)
        .order("inserted_at", { ascending: false });
      if (error) {
        console.error("Error fetching user reviews:", error);
        setLoadingReviews(false);
        return;
      }

      const reviewsWithFullUrl = await Promise.all(
        reviewsData.map(async (review: any) => {
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
      setLoadingReviews(false);
    } catch (err) {
      console.error("Unexpected error while fetching user reviews:", err);
      setLoadingReviews(false);
    }
  };

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });
    if (!result.canceled) {
      const originalUri = result.assets[0].uri;
      const manipResult = await ImageManipulator.manipulateAsync(
        originalUri,
        [],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      const compressedUri = manipResult.uri;
      setAvatar(compressedUri);

      const {
        data: { user: User },
      } = await supabase.auth.getUser();
      if (!User) return;
      const base64 = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: "base64",
      });
      const filePath = `${User.id}/avatar.jpg`;
      const contentType = "image/jpeg";
      try {
        const { error } = await supabase.storage
          .from("avatars")
          .upload(filePath, decode(base64), { contentType, upsert: true });
        if (error) {
          console.error("Error uploading avatar:", error);
        } else {
          try {
            customEvent("uploaded_avatar", {
              user_id: User.id,
            });
          } catch (error) {
            console.error("Error sending event:", error);
          }
          console.log("Avatar uploaded successfully");
        }
      } catch (err) {
        console.error("Unexpected error while uploading avatar:", err);
      }
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    } else {
      try {
        customEvent("log_out", {
          user_id: profile?.id,
        });
      } catch (error) {
        console.error("Error sending event:", error);
      }
      router.navigate("/");
    }
  };

  const deleteReview = async (id: number) => {
    const { error } = await supabase
      .from("reviews")
      .update({ state: 3 })
      .eq("id", id);
    if (error) {
      console.error("Error updating review state:", error);
    } else {
      setUserReviews((prevReviews) =>
        prevReviews.filter((review) => review.id !== id)
      );
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
      ],
      { cancelable: true }
    );
  };

  const renderReviewItem = ({ item }: { item: Review }) => (
    <ReviewItem
      review={item}
      aspectRatio={1}
      canDelete={true}
      onDelete={() => confirmDeleteReview(item.id)}
      onShowLikes={(id: string) => setSelectedReviewId(id)}
    />
  );

  const renderEmpty = () => {
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
    if (profile && profile.id) {
      loadUserAvatar(profile.id);
      loadUserReviews(profile.id);
    }
  }, [profile]);

  return (
    <View style={styles.container}>
      {/* Profile Content */}
      <View style={styles.profileHeader}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
          {avatar ? (
            <Image style={styles.avatar} source={{ uri: avatar }} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {profile?.username
                  ? profile.username.charAt(0).toUpperCase()
                  : "?"}
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
      {/* Reviews List */}
      <View style={styles.reviewsContainer}>
        <FlatList
          data={userReviews}
          renderItem={renderReviewItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.gridContent}
          ListEmptyComponent={renderEmpty}
          onRefresh={() => {
            if (profile && profile.id) {
              loadUserReviews(profile.id);
            }
          }}
          refreshing={loadingReviews}
        />
      </View>
      {/* Render the LikesSlider on Home */}
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
  container: {
    flex: 1,
  },
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
  userInfoContainer: {
    flex: 1,
  },
  statsContainer: {
    flexDirection: "row",
    marginTop: 8,
  },
  statItem: {
    alignItems: "center",
    marginRight: 16,
  },
  statNumber: {
    fontSize: 16,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 14,
    color: "#777",
  },
  reviewsContainer: {
    flex: 1,
  },
  gridContent: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: "center",
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
  },
  headerButton: {
    marginRight: 10,
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
});

export default Profile;
