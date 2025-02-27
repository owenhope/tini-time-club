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
import { useRouter, useLocalSearchParams, useNavigation } from "expo-router";

interface ProfileType {
  id: string;
  username: string;
}

const Profile = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingAvatar, setLoadingAvatar] = useState<boolean>(false);
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(
    null
  );
  const [doesFollow, setDoesFollow] = useState<boolean>(false);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);

  const { profile } = useProfile();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const usernameParam = params.username as string | undefined;
  const isOwnProfile =
    !usernameParam || (profile?.username && usernameParam === profile.username);
  const displayProfile = isOwnProfile ? profile : selectedProfile;

  // Check follow status (for non-own profiles)
  useEffect(() => {
    const checkFollowStatus = async () => {
      if (displayProfile && profile && !isOwnProfile) {
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
  }, [displayProfile, profile, isOwnProfile]);

  const toggleFollow = async () => {
    if (!profile || !displayProfile) return;

    if (doesFollow) {
      // Unfollow: delete the record from the followers table
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", profile.id)
        .eq("following_id", displayProfile.id);
      if (error) {
        console.error("Error unfollowing user:", error);
        Alert.alert("Error", "Unable to unfollow user. Please try again.");
      } else {
        setDoesFollow(false);
      }
    } else {
      // Follow: use upsert to insert or update the record in the followers table
      const { error } = await supabase
        .from("followers")
        .insert(
          [{ follower_id: profile.id, following_id: displayProfile.id }],
          { upsert: true }
        );
      if (error) {
        console.error("Error following user:", error);
        Alert.alert("Error", "Unable to follow user. Please try again.");
      } else {
        setDoesFollow(true);
      }
    }
  };

  // Fetch follower and following counts from the database
  useEffect(() => {
    const fetchFollowCounts = async () => {
      if (displayProfile) {
        // Get followers count (records where following_id equals the user's id)
        const { count: followers, error: errorFollowers } = await supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", displayProfile.id);
        if (errorFollowers) {
          console.error("Error fetching followers count:", errorFollowers);
        } else {
          setFollowersCount(followers || 0);
        }
        // Get following count (records where follower_id equals the user's id)
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

  // Update header with custom title including follow counts
  useEffect(() => {
    if (displayProfile) {
      navigation.setOptions({
        headerTitle: () => (
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>{displayProfile.username}</Text>
          </View>
        ),
        headerLeft: () =>
          !isOwnProfile && (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerButtonLeft}
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          ),
        headerRight: () =>
          isOwnProfile ? (
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.headerButton}
            >
              <Ionicons name="log-out-outline" size={24} color="black" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={toggleFollow}
              style={styles.headerButton}
            >
              <Text style={styles.friendText}>
                {doesFollow ? "Unfollow" : "Follow"}
              </Text>
            </TouchableOpacity>
          ),
      });
    }
  }, [
    displayProfile,
    isOwnProfile,
    navigation,
    doesFollow,
    followersCount,
    followingCount,
  ]);

  useEffect(() => {
    setAvatar(null);
    if (!isOwnProfile && usernameParam) {
      fetchSelectedProfile(usernameParam);
    }
  }, [usernameParam, isOwnProfile]);

  const fetchSelectedProfile = async (username: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();
      if (error) {
        console.error("Error fetching selected profile:", error);
      } else {
        setSelectedProfile(data);
      }
    } catch (err) {
      console.error("Unexpected error fetching profile:", err);
    }
  };

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
        console.log(error);
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
    if (!isOwnProfile) return;
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
      canDelete={isOwnProfile}
      onDelete={() => confirmDeleteReview(item.id)}
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
    if (!isOwnProfile && usernameParam) {
      fetchSelectedProfile(usernameParam);
    }
  }, [usernameParam, isOwnProfile]);

  useEffect(() => {
    if (displayProfile && displayProfile.id) {
      loadUserAvatar(displayProfile.id);
      loadUserReviews(displayProfile.id);
    }
  }, [displayProfile]);

  return (
    <View style={styles.container}>
      {/* Profile Content */}
      <View style={styles.profileHeader}>
        <TouchableOpacity
          onPress={isOwnProfile ? pickImage : undefined}
          style={styles.avatarContainer}
        >
          {avatar ? (
            <Image style={styles.avatar} source={{ uri: avatar }} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>
                {displayProfile?.username
                  ? displayProfile.username.charAt(0).toUpperCase()
                  : "?"}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <Pressable
          style={styles.userInfoContainer}
          onPress={() => {
            if (isOwnProfile) {
              navigation.navigate("followers");
            }
          }}
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
            if (displayProfile && displayProfile.id) {
              loadUserReviews(displayProfile.id);
            }
          }}
          refreshing={loadingReviews}
        />
      </View>
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
  headerButtonLeft: {
    marginLeft: 5,
  },
  friendText: {
    fontSize: 16,
    color: "#007aff",
  },
  headerTitleContainer: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#777",
  },
});

export default Profile;
