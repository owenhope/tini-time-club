import React, { useRef } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Pressable,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import ReviewRating from "@/components/ReviewRating";
import { Review } from "@/types/types";

const screenWidth = Dimensions.get("window").width;

interface ReviewItemProps {
  review: Review;
  aspectRatio: number;
  onDelete: () => void;
  canDelete: boolean;
}

const ReviewItem: React.FC<ReviewItemProps> = ({
  review,
  aspectRatio,
  canDelete,
  onDelete,
}) => {
  const router = useRouter();

  // Create an animated value for opacity (starting at 1)
  const overlayOpacity = useRef(new Animated.Value(1)).current;

  // Animate opacity to the given value over 300ms
  const animateOpacity = (toValue: number) => {
    Animated.timing(overlayOpacity, {
      toValue,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const formattedDate = new Date(review.inserted_at).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric",
    }
  );
  const formattedTime = new Date(review.inserted_at).toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "numeric",
      hour12: true,
    }
  );

  return (
    <Pressable
      onLongPress={() => animateOpacity(0)}
      onPressOut={() => animateOpacity(1)}
    >
      <View style={[styles.imageContainer, { aspectRatio }]}>
        <Image source={{ uri: review.image_url }} style={styles.reviewImage} />
        <Animated.View style={[styles.topBar, { opacity: overlayOpacity }]}>
          <Pressable
            onPress={() =>
              review.profile?.username &&
              router.push(`/profile/${review.profile.username}`)
            }
          >
            <Text style={styles.userLabelText}>
              {review.profile?.username || "Unknown"}
            </Text>
          </Pressable>
          <View style={styles.dateAndDeleteContainer}>
            <Text style={styles.dateLabelText}>
              {formattedDate} {formattedTime}
            </Text>
            {canDelete && (
              <TouchableOpacity onPress={onDelete}>
                <Ionicons
                  name="trash"
                  size={20}
                  color="#fff"
                  style={styles.deleteIcon}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <Text style={styles.locationName}>
            {review.location ? review.location.name : "N/A"}
          </Text>
          {review.location?.address && (
            <Text style={styles.locationAddress}>
              {review.location.address}
            </Text>
          )}
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
          {review.comment && (
            <>
              <Text style={styles.commentTitle}>Comment:</Text>
              <Text style={styles.commentText}>{review.comment}</Text>
            </>
          )}
        </Animated.View>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  imageContainer: {
    width: screenWidth,
    position: "relative",
  },
  reviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "black",
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 2,
  },
  userLabelText: {
    color: "#fff",
    fontSize: 18,
  },
  dateAndDeleteContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  dateLabelText: {
    color: "#fff",
    fontSize: 18,
  },
  deleteIcon: {
    marginLeft: 8,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    padding: 20,
    justifyContent: "flex-end",
  },
  locationName: {
    fontWeight: "bold",
    fontSize: 24,
    color: "#fff",
  },
  locationAddress: {
    fontSize: 14,
    color: "#ddd",
    marginBottom: 8,
  },
  ratingLabel: {
    fontWeight: "bold",
    fontSize: 16,
    marginTop: 8,
    marginBottom: 4,
    color: "#fff",
  },
  spiritText: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "capitalize",
    marginTop: 8,
    color: "#fff",
  },
  typeText: {
    fontSize: 16,
    fontWeight: "bold",
    textTransform: "capitalize",
    marginTop: 8,
    color: "#fff",
  },
  commentTitle: {
    fontSize: 16,
    marginTop: 8,
    fontWeight: "bold",
    color: "#FFF",
  },
  commentText: {
    fontSize: 16,
    marginTop: 4,
    color: "#fff",
  },
});

export default ReviewItem;
