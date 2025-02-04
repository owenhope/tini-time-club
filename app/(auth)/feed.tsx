import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { AirbnbRating } from "react-native-ratings";

// Get the device's screen width so we can set a square image
const screenWidth = Dimensions.get("window").width;

// Set the number of reviews to fetch per page.
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
}

interface ReviewRatingProps {
  value: number;
  label: "taste" | "presentation";
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

interface ReviewItemProps {
  review: Review;
}

// Component to render each review row with overlay text on the image.
const ReviewItem: React.FC<ReviewItemProps> = ({ review }) => {
  return (
    <View style={styles.reviewContainer}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: review.image_url }} style={styles.reviewImage} />
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

const Feed: React.FC = () => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [page, setPage] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);

  useEffect(() => {
    loadReviews(true);
  }, []);

  /**
   * Loads reviews from Supabase.
   * @param refresh If true, refreshes the list (starts at page 0).
   */
  const loadReviews = async (refresh: boolean = false) => {
    // If we're refreshing, start at page 0.
    const nextPage = refresh ? 0 : page + 1;

    if (refresh) {
      setRefreshing(true);
    } else {
      // Prevent further calls if no more data
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
        user_id
      `
      )
      .order("inserted_at", { ascending: false })
      .range(start, end);

    if (error) {
      console.error("Error fetching reviews:", error);
      if (refresh) {
        setRefreshing(false);
      } else {
        setLoadingMore(false);
      }
      return;
    }

    // Update each review with the full public URL for the image.
    const reviewsWithFullUrl = reviewsData.map((review: any) => {
      const {
        data: { publicUrl },
      } = supabase.storage.from("review_images").getPublicUrl(review.image_url);
      return { ...review, image_url: publicUrl };
    });

    // If refreshing, replace the reviews list; otherwise, append to it.
    if (refresh) {
      setReviews(reviewsWithFullUrl);
    } else {
      setReviews((prev) => [...prev, ...reviewsWithFullUrl]);
    }

    // Update page and hasMore state
    setPage(nextPage);
    setHasMore(reviewsWithFullUrl.length === pageSize);

    if (refresh) {
      setRefreshing(false);
    } else {
      setLoadingMore(false);
    }
  };

  // Handler for pull-to-refresh
  const onRefresh = useCallback(() => {
    loadReviews(true);
  }, []);

  // Handler for infinite scroll
  const onEndReached = () => {
    if (!loadingMore && hasMore && !refreshing) {
      loadReviews(false);
    }
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
      {loading && <Text>Loading...</Text>}
      <FlatList
        data={reviews}
        renderItem={({ item }) => <ReviewItem review={item} />}
        keyExtractor={(item) => item.id.toString()}
        onRefresh={onRefresh}
        refreshing={refreshing}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />
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
});

export default Feed;
