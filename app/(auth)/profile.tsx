import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Image,
  FlatList,
  Text,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { supabase } from "@/utils/supabase";
import { decode } from "base64-arraybuffer";
import { useProfile } from "@/context/profile-context";
import { Review } from "@/types/types"; // Adjust the import path as needed
import ReviewItem from "@/components/ReviewItem"; // Adjust the import path as needed
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons"; // Import Ionicons for the logout icon
import { useRouter } from "expo-router";

const Profile = () => {
  const [avatar, setAvatar] = useState<string | null>(null);
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [loadingAvatar, setLoadingAvatar] = useState<boolean>(false);
  const { profile } = useProfile(); // Using the context to get the profile
  const router = useRouter();

  useEffect(() => {
    loadUserAvatar();
    loadUserReviews();
  }, []);

  // New effect: subscribe to realtime review INSERT events for the current user.
  useEffect(() => {
    let subscription: any;

    async function subscribeToNewReviews() {
      const {
        data: { user: User },
      } = await supabase.auth.getUser();
      if (!User) return;

      interface ReviewPayload {
        new: Review;
      }

      interface SignedUrlResponse {
        signedUrl: string;
      }

      subscription = supabase
        .channel("public:reviews")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "reviews",
            filter: `user_id=eq.${User.id}&state=eq.1`,
          },
          async (payload: ReviewPayload) => {
            let newReview = payload.new;
            // Get a signed URL for the review image
            const { data, error } = await supabase.storage
              .from("review_images")
              .createSignedUrl(newReview.image_url, 60);
            if (!error && data) {
              newReview.image_url = (data as SignedUrlResponse).signedUrl;
            }
            // Prepend the new review to the list of reviews
            setUserReviews((prevReviews) => [newReview, ...prevReviews]);
          }
        )
        .subscribe();
    }

    subscribeToNewReviews();

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, []);

  const loadUserAvatar = async () => {
    setLoadingAvatar(true);
    const {
      data: { user: User },
    } = await supabase.auth.getUser();
    if (!User) {
      setLoadingAvatar(false);
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .download(`${User.id}/avatar.png`);
      if (error) {
        if (error.message.includes("The resource was not found")) {
          console.log("Avatar not found for user:", User.id);
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

  const loadUserReviews = async () => {
    setLoadingReviews(true);
    const {
      data: { user: User },
    } = await supabase.auth.getUser();
    if (!User) {
      setLoadingReviews(false);
      return;
    }
    try {
      // Query to fetch reviews that are in state 1
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
        .eq("user_id", User.id)
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
      setAvatar(result.assets[0].uri);
      const {
        data: { user: User },
      } = await supabase.auth.getUser();
      if (!User) return;
      const img = result.assets[0];
      const base64 = await FileSystem.readAsStringAsync(img.uri, {
        encoding: "base64",
      });
      const filePath = `${User.id}/avatar.png`;
      const contentType = "image/png";
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

  // Update the review's state to 3 in the database and remove it from the local state.
  const deleteReview = async (id: number) => {
    const { error } = await supabase
      .from("reviews")
      .update({ state: 3 })
      .eq("id", id);
    if (error) {
      console.error("Error updating review state:", error);
    } else {
      // Remove the deleted review from the local state so that it no longer appears in the FlatList.
      setUserReviews((prevReviews) =>
        prevReviews.filter((review) => review.id !== id)
      );
    }
  };

  // Confirm deletion with an alert prompt before actually deleting the review.
  const confirmDeleteReview = (id: number) => {
    Alert.alert(
      "Confirm Delete",
      "Are you sure you want to delete your review?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteReview(id),
        },
      ],
      { cancelable: true }
    );
  };

  // Pass a callback that opens a confirmation prompt before deleting.
  const renderReviewItem = ({ item }: { item: Review }) => (
    <ReviewItem
      review={item}
      aspectRatio={1}
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

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.container}>
        {/* Instagram-style Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarContainer}>
            {avatar ? (
              <Image style={styles.avatar} source={{ uri: avatar }} />
            ) : (
              <View style={styles.avatarPlaceholder} />
            )}
          </TouchableOpacity>
          <View style={styles.userInfoContainer}>
            <Text style={styles.usernameText}>
              {profile?.username || "Username"}
            </Text>
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
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>

        {/* Reviews List with pull-to-refresh and two-column grid */}
        <View style={styles.reviewsContainer}>
          <FlatList
            data={userReviews}
            renderItem={renderReviewItem}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={renderEmpty}
            onRefresh={loadUserReviews}
            refreshing={loadingReviews}
            numColumns={2}
            columnWrapperStyle={styles.columnWrapper}
          />
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Profile Header Styles
  profileHeader: {
    flexDirection: "row",
    padding: 16,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
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
  bioText: {
    marginTop: 8,
    fontSize: 14,
  },
  logoutButton: {
    marginLeft: "auto",
    padding: 8,
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
});

export default Profile;
