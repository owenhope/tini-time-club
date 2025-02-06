import React from "react";
import { View, Text, Image, StyleSheet, Dimensions } from "react-native";
import ReviewRating from "@/components/ReviewRating"; // Adjust the import path as needed
import { Review } from "@/types/types"; // Adjust the import path as needed

const screenWidth = Dimensions.get("window").width;
interface ReviewItemProps {
  review: Review;
}

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
          <Text style={styles.commentTitle}>Comment:</Text>
          <Text style={styles.commentText}>{review.comment}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  reviewContainer: {
    marginBottom: 16,
  },
  imageContainer: {
    width: screenWidth,
    aspectRatio: 9 / 16,
    position: "relative",
  },
  reviewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  userLabelContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    zIndex: 2,
  },
  userLabelText: {
    color: "#fff",
    fontSize: 18,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
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
