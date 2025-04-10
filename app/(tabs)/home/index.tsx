import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import ReviewItem from "@/components/ReviewItem"; // Adjust the import path as needed
import { Review } from "@/types/types"; // Adjust the import path as needed
import { useFocusEffect } from "@react-navigation/native";
import LikeSlider from "@/components/LikeSlider";

const pageSize = 10;

function Home() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(false); // used for initial load
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const { profile } = useProfile();

  // New state to track whether the first load has completed.
  const [firstLoadDone, setFirstLoadDone] = useState<boolean>(false);

  // State for the username modal
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>("");

  // State for the likes slider (controlled from Home)
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  // When the profile changes, load reviews and check username.
  useEffect(() => {
    loadReviews(true);
  }, [profile]);

  useEffect(() => {
    if (profile && !profile.username) {
      setShowUsernameModal(true);
    } else {
      setShowUsernameModal(false);
    }
  }, [profile]);

  // Refresh reviews when the Home screen regains focus.
  useFocusEffect(
    useCallback(() => {
      loadReviews(true);
    }, [profile])
  );

  // Helper: Fetch the list of user IDs that the current user follows.
  const getFollowedUserIds = async (): Promise<string[]> => {
    if (!profile) return [];
    const { data, error } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", profile.id);
    if (error) {
      console.error("Error fetching followed users:", error);
      return [];
    }
    return data.map((row: any) => row.following_id);
  };

  // Load reviews only from users that the current user follows plus your own reviews.
  const loadReviews = async (refresh: boolean = false) => {
    if (!profile) return;
    const nextPage = refresh ? 0 : page + 1;

    if (refresh) {
      // For the initial load, set loading to true only when there are no reviews yet.
      if (page === 0) setLoading(true);
      setRefreshing(true);
    } else {
      if (!hasMore) return;
      setLoadingMore(true);
    }

    const start = nextPage * pageSize;
    const end = start + pageSize - 1;

    // Get followed user IDs and include your own user id.
    const followedUserIds = await getFollowedUserIds();
    const queryUserIds = followedUserIds.includes(profile.id)
      ? followedUserIds
      : [...followedUserIds, profile.id];

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
        location:locations!reviews_location_fkey(id, name, address),
        spirit:spirit(name),
        type:type(name),
        user_id,
        profile:profiles!user_id(username)
        `
      )
      .eq("state", 1)
      .in("user_id", queryUserIds)
      .order("inserted_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("Error fetching reviews:", error);
      refresh ? setRefreshing(false) : setLoadingMore(false);
      setLoading(false);
      // Even if error, mark first load as done to avoid an infinite spinner.
      if (!firstLoadDone) setFirstLoadDone(true);
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

    if (refresh) {
      setReviews(reviewsWithFullUrl);
      setLoading(false);
      setRefreshing(false);
      // Mark the first load as done.
      if (!firstLoadDone) setFirstLoadDone(true);
    } else {
      setReviews((prev) => [...prev, ...reviewsWithFullUrl]);
      setLoadingMore(false);
    }

    setPage(nextPage);
    setHasMore(reviewsWithFullUrl.length === pageSize);
  };

  const onRefresh = useCallback(() => {
    loadReviews(true);
  }, [profile]);

  const onEndReached = () => {
    if (!loadingMore && hasMore && !refreshing) {
      loadReviews(false);
    }
  };

  // Save the username to Supabase.
  const handleSaveUsername = async () => {
    if (!newUsername.trim()) return;

    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("id", profile.id);

    if (error) {
      console.error("Error updating username:", error);
      // Optionally, display an error message to the user.
    } else {
      setShowUsernameModal(false);
    }
  };

  // Render component for empty state.
  const renderEmpty = () => {
    // Only display the empty state if the initial load has completed and we're not currently refreshing.
    if (!firstLoadDone || loading || refreshing) {
      return null;
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No reviews available.</Text>
      </View>
    );
  };

  // If the initial load hasn't finished, display a full-screen spinner.
  if (!firstLoadDone) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={reviews}
        renderItem={({ item }) => (
          <ReviewItem
            review={item}
            aspectRatio={9 / 16}
            onDelete={() => {}}
            // Pass the onShowLikes callback to trigger the slider in Home.
            onShowLikes={(id: string) => setSelectedReviewId(id)}
          />
        )}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
      />

      <Modal visible={showUsernameModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Welcome to Tini Time Club</Text>
            <Text style={styles.modalSubTitle}>Set Your Username</Text>
            <TextInput
              style={styles.inputField}
              placeholder="Enter username"
              value={newUsername}
              onChangeText={setNewUsername}
              autoCapitalize="none"
            />
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSaveUsername}
            >
              <Text>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Render the LikesSlider on Home */}
      {selectedReviewId && (
        <LikeSlider
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingVertical: 20,
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#555",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#151515",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: "90%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#fff",
  },
  modalSubTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#fff",
  },
  inputField: {
    marginVertical: 4,
    height: 50,
    width: "90%",
    borderWidth: 1,
    borderColor: "#FFF",
    borderRadius: 4,
    padding: 10,
    color: "#fff",
    backgroundColor: "#363636",
  },
  modalButton: {
    marginVertical: 15,
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 4,
    minWidth: 100,
    fontSize: 16,
  },
});

export default Home;
