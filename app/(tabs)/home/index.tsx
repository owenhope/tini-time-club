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
import ReviewItem from "@/components/ReviewItem";
import { Review } from "@/types/types";
import { useFocusEffect } from "@react-navigation/native";
import LikeSlider from "@/components/LikeSlider";
import CommentsSlider from "@/components/CommentsSlider";

const pageSize = 10;

function Home() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { profile } = useProfile();
  const [selectedCommentReview, setSelectedCommentReview] =
    useState<Review | null>(null);
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [showUsernameModal, setShowUsernameModal] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);

  useEffect(() => {
    loadReviews(true);
  }, [profile]);

  useEffect(() => {
    if (profile && !profile.username) setShowUsernameModal(true);
    else setShowUsernameModal(false);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      loadReviews(true);
    }, [profile])
  );

  const getFollowedUserIds = async (): Promise<string[]> => {
    if (!profile) return [];
    const { data, error } = await supabase
      .from("followers")
      .select("following_id")
      .eq("follower_id", profile.id);
    if (error) return [];
    return data.map((row: any) => row.following_id);
  };

  const loadReviews = async (refresh = false) => {
    if (!profile) return;
    const nextPage = refresh ? 0 : page + 1;
    if (refresh) {
      if (page === 0) setLoading(true);
      setRefreshing(true);
    } else {
      if (!hasMore) return;
      setLoadingMore(true);
    }

    const start = nextPage * pageSize;
    const end = start + pageSize - 1;
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
        profile:profiles!user_id(username, avatar_url)
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
      if (!firstLoadDone) setFirstLoadDone(true);
      return;
    }

    const reviewsWithUrls = await Promise.all(
      reviewsData.map(async (review: any) => {
        const { data } = await supabase.storage
          .from("review_images")
          .createSignedUrl(review.image_url, 60);
        return {
          ...review,
          image_url: data?.signedUrl || review.image_url,
          location: review.location
            ? { ...review.location, id: review.location.id || "" }
            : undefined,
        };
      })
    );

    if (refresh) {
      setReviews(reviewsWithUrls);
      setRefreshing(false);
      setLoading(false);
      if (!firstLoadDone) setFirstLoadDone(true);
    } else {
      setReviews((prev) => [...prev, ...reviewsWithUrls]);
      setLoadingMore(false);
    }

    setPage(nextPage);
    setHasMore(reviewsWithUrls.length === pageSize);
  };

  const onRefresh = useCallback(() => loadReviews(true), [profile]);
  const onEndReached = () => {
    if (!loadingMore && hasMore && !refreshing) loadReviews(false);
  };

  const handleSaveUsername = async () => {
    if (!newUsername.trim()) return;
    const { error } = await supabase
      .from("profiles")
      .update({ username: newUsername.trim() })
      .eq("id", profile.id);
    if (!error) setShowUsernameModal(false);
  };

  const renderEmpty = () => {
    if (!firstLoadDone || loading || refreshing) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No reviews available.</Text>
      </View>
    );
  };

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
            canDelete={false}
            onShowLikes={(id: string) => setSelectedReviewId(id)}
            onShowComments={() => setSelectedCommentReview(item)}
            onCommentAdded={(reviewId, newComment) => {
              setReviews((prev) =>
                prev.map((r) =>
                  r.id === reviewId
                    ? {
                        ...r,
                        _commentPatch: { action: "add", data: newComment },
                      }
                    : r
                )
              );
            }}
            onCommentDeleted={(reviewId, commentId) => {
              setReviews((prev) =>
                prev.map((r) =>
                  r.id === reviewId
                    ? {
                        ...r,
                        _commentPatch: { action: "delete", id: commentId },
                      }
                    : r
                )
              );
            }}
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

      {selectedReviewId && (
        <LikeSlider
          reviewId={selectedReviewId}
          onClose={() => setSelectedReviewId(null)}
        />
      )}

      {selectedCommentReview && (
        <CommentsSlider
          review={selectedCommentReview}
          onClose={() => setSelectedCommentReview(null)}
          onCommentAdded={(reviewId, newComment) => {
            setReviews((prev) =>
              prev.map((r) =>
                r.id === reviewId
                  ? { ...r, _commentPatch: { action: "add", data: newComment } }
                  : r
              )
            );
          }}
          onCommentDeleted={(reviewId, commentId) => {
            setReviews((prev) =>
              prev.map((r) =>
                r.id === reviewId
                  ? { ...r, _commentPatch: { action: "delete", id: commentId } }
                  : r
              )
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyContainer: { padding: 20, alignItems: "center" },
  emptyText: { fontSize: 16, color: "#555" },
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
