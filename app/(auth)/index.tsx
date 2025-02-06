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
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import ReviewItem from "@/components/ReviewItem"; // Adjust the import path as needed
import { Review } from "@/types/types"; // Adjust the import path as needed

const pageSize = 10;

const Index: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const { profile } = useProfile();

  // State for the username modal
  const [showUsernameModal, setShowUsernameModal] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>("");

  useEffect(() => {
    loadReviews(true);
  }, []);

  // When the profile changes, check for a username. If none exists, show the modal.
  useEffect(() => {
    if (profile && !profile.username) {
      setShowUsernameModal(true);
    } else {
      setShowUsernameModal(false);
    }
  }, [profile]);

  const loadReviews = async (refresh: boolean = false) => {
    const nextPage = refresh ? 0 : page + 1;

    if (refresh) {
      setRefreshing(true);
    } else {
      if (!hasMore) return;
      setLoadingMore(true);
    }

    const start = nextPage * pageSize;
    const end = start + pageSize - 1;

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
        location:locations!reviews_location_fkey(name, address),
        spirit:spirit(name),
        type:type(name),
        user_id,
        profile:profiles!user_id(username)
        `
      )
      .order("inserted_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("Error fetching reviews:", error);
      refresh ? setRefreshing(false) : setLoadingMore(false);
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
    } else {
      setReviews((prev) => [...prev, ...reviewsWithFullUrl]);
    }

    setPage(nextPage);
    setHasMore(reviewsWithFullUrl.length === pageSize);

    refresh ? setRefreshing(false) : setLoadingMore(false);
  };

  const onRefresh = useCallback(() => {
    loadReviews(true);
  }, []);

  const onEndReached = () => {
    if (!loadingMore && hasMore && !refreshing) {
      loadReviews(false);
    }
  };

  // Save the username to Supabase
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
      // Optionally, update your profile context here.
      setShowUsernameModal(false);
    }
  };

  // Component to render when there are no reviews.
  const renderEmpty = () => {
    if (loading || refreshing) {
      return null;
    }
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No reviews available.</Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading && !refreshing && <Text>Loading...</Text>}
      <FlatList
        data={reviews}
        renderItem={({ item }) => <ReviewItem review={item} />}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
      />

      <Modal
        visible={showUsernameModal}
        transparent
        animationType="slide"
        onRequestClose={() => {}}
      >
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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

export default Index;
