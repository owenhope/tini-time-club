import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  Button,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
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
  // add any additional fields as needed
}

const Profile = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingAvatar, setLoadingAvatar] = useState<boolean>(false);
  // This state is only used if you’re viewing someone else’s profile.
  const [selectedProfile, setSelectedProfile] = useState<ProfileType | null>(
    null
  );
  // Friend state (for non‑own profiles)
  const [isFriend, setIsFriend] = useState<boolean>(false);

  const { profile } = useProfile();
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const usernameParam = params.username as string | undefined;
  const isOwnProfile =
    !usernameParam || (profile?.username && usernameParam === profile.username);
  const displayProfile = isOwnProfile ? profile : selectedProfile;

  const toggleFriend = () => {
    setIsFriend((prev) => !prev);
  };

  useEffect(() => {
    if (displayProfile) {
      if (isOwnProfile) {
        navigation.setOptions({
          headerTitle: displayProfile.username,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleLogout}
              style={styles.headerButton}
            >
              <Ionicons name="log-out-outline" size={24} color="black" />
            </TouchableOpacity>
          ),
          headerLeft: undefined,
        });
      } else {
        navigation.setOptions({
          headerTitle: displayProfile.username,
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.headerButtonLeft}
            >
              <Ionicons name="arrow-back" size={24} color="black" />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={toggleFriend}
              style={styles.headerButton}
            >
              <Text style={styles.friendText}>
                {isFriend ? "Remove Friend" : "Add Friend"}
              </Text>
            </TouchableOpacity>
          ),
        });
      }
    }
  }, [displayProfile, isOwnProfile, navigation, isFriend]);

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
          profile:profiles(username)
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
        {/* Display user stats */}
        <View style={styles.userInfoContainer}>
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{userReviews.length}</Text>
              <Text style={styles.statLabel}>Reviews</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Followers</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Following</Text>
            </View>
          </View>
        </View>
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
  usernameText: {
    fontSize: 20,
    fontWeight: "bold",
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
  columnWrapper: {
    justifyContent: "space-between",
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
});

export default Profile;
