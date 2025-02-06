import React from "react";
import { View, Text, Image, StyleSheet, Dimensions } from "react-native";
import ReviewRating from "@/components/ReviewRating"; // Adjust the import path as needed
import { Review } from "@/types/types"; // Adjust the import path as needed

const screenWidth = Dimensions.get("window").width;

interface ReviewItemProps {
  review: Review;
  aspectRatio: number;
}

const ReviewItem: React.FC<ReviewItemProps> = ({ review, aspectRatio }) => {
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
    <View>
      <View style={[styles.imageContainer, { aspectRatio }]}>
        <Image source={{ uri: review.image_url }} style={styles.reviewImage} />
        <View style={styles.topBar}>
          <Text style={styles.userLabelText}>
            {review.profile?.username || "Unknown"}
          </Text>
          <Text style={styles.dateLabelText}>
            {formattedDate} {formattedTime}
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
  dateLabelText: {
    color: "#fff",
    fontSize: 18,
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
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
