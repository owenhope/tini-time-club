import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { AirbnbRating } from "react-native-ratings";
import { useProfile } from "@/context/profile-context";

const screenWidth = Dimensions.get("window").width;
const pageSize = 10;

interface Location {
  name: string;
  address: string;
}

interface NamedEntity {
  name: string;
}

interface Review {
  id: number;
  comment: string;
  image_url: string;
  inserted_at: string;
  taste: number;
  presentation: number;
  location?: Location;
  spirit?: NamedEntity;
  type?: NamedEntity;
  user_id: string;
  profile?: {
    username: string;
  };
}

interface ReviewRatingProps {
  value: number;
  label: "taste" | "presentation";
}

interface ReviewItemProps {
  review: Review;
}

// Component to display a rating using custom images and colors.
const ReviewRating: React.FC<ReviewRatingProps> = ({ value, label }) => {
  const MARTINI_IMAGE = require("@/assets/images/martini_transparent.png");
  const OLIVE_IMAGE = require("@/assets/images/olive_transparent.png");
  const OLIVE_COLOR = "#c3eb78";
  const MARTINI_COLOR = "#f3ffc6";

  return (
    <AirbnbRating
      starImage={label === "taste" ? OLIVE_IMAGE : MARTINI_IMAGE}
      selectedColor={label === "taste" ? OLIVE_COLOR : MARTINI_COLOR}
      count={5}
      size={20}
      reviewSize={16}
      showRating={false}
      ratingContainerStyle={{ alignItems: "flex-start" }}
      defaultRating={value}
    />
  );
};

const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => {
  return (
    <View style={styles.reviewContainer}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: review.image_url }} style={styles.reviewImage} />
        <View style={styles.userLabelContainer}>
          <Text style={styles.userLabelText}>
            {review.profile?.username || "Unknown"}
          </Text>
        </View>
        <View style={styles.overlay}>
          <Text style={styles.locationName}>
            {review.location ? review.location.name : "N/A"}
          </Text>
          {review.location?.address ? (
            <Text style={styles.locationAddress}>
              {review.location.address}
            </Text>
          ) : null}
          <Text style={styles.ratingLabel}>Taste</Text>
          <ReviewRating value={review.taste} label="taste" />
          <Text style={styles.ratingLabel}>Presentation</Text>
          <ReviewRating value={review.presentation} label="presentation" />
          <Text style={styles.spiritText}>
            Spirit: {review.spirit ? review.spirit.name : "N/A"}
          </Text>
          <Text style={styles.typeText}>
            Type: {review.type ? review.type.name : "N/A"}
          </Text>
          <Text style={styles.commentText}>Comment: {review.comment}</Text>
        </View>
      </View>
    </View>
  );
};

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

  /**
   * Loads reviews from Supabase.
   * @param refresh If true, refreshes the list (starts at page 0).
   */
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
    console.log(reviewsData);
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
  reviewContainer: {
    marginBottom: 16,
  },
  imageContainer: {
    width: screenWidth,
    height: screenWidth, // Square container
    position: "relative",
  },
  reviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  // User label container positioned at the top right of the image.
  userLabelContainer: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  userLabelText: {
    color: "#fff",
    fontSize: 12,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 8,
    justifyContent: "flex-end",
  },
  locationName: {
    fontWeight: "bold",
    fontSize: 18,
    color: "#fff",
  },
  locationAddress: {
    fontSize: 14,
    color: "#ddd",
    marginBottom: 4,
  },
  ratingLabel: {
    fontWeight: "bold",
    marginTop: 4,
    color: "#fff",
  },
  spiritText: {
    fontWeight: "bold",
    textTransform: "capitalize",
    marginTop: 4,
    color: "#fff",
  },
  typeText: {
    fontWeight: "bold",
    textTransform: "capitalize",
    marginTop: 2,
    color: "#fff",
  },
  commentText: {
    fontWeight: "bold",
    marginTop: 4,
    color: "#fff",
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
