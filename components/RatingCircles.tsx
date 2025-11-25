import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface RatingCirclesProps {
  location: {
    rating?: number;
    taste_avg?: number;
    presentation_avg?: number;
    total_ratings?: number;
  };
  circleSize?: number;
  textSize?: number;
  labelSize?: number;
}

const RatingCircles: React.FC<RatingCirclesProps> = ({
  location,
  circleSize = 50,
  textSize = 16,
  labelSize = 14,
}) => {
  const circleStyle = {
    width: circleSize,
    height: circleSize,
    borderRadius: circleSize / 2,
  };

  const textStyle = {
    fontSize: textSize,
  };

  const labelStyle = {
    fontSize: labelSize,
  };

  return (
    <View style={styles.allRatingsContainer}>
      <View style={styles.ratingContainer}>
        <View style={[styles.overallRatingCircle, circleStyle]}>
          <Text style={[styles.ratingText, textStyle]}>
            {location.rating ? location.rating.toFixed(1) : "N/A"}
          </Text>
        </View>
        <Text style={[styles.ratingLabel, labelStyle]}>Overall</Text>
      </View>

      <View style={styles.ratingContainer}>
        <View style={[styles.tasteCircle, circleStyle]}>
          <Text style={[styles.ratingText, textStyle]}>
            {location.taste_avg ? location.taste_avg.toFixed(1) : "N/A"}
          </Text>
        </View>
        <Text style={[styles.ratingLabel, labelStyle]}>Taste</Text>
      </View>

      <View style={styles.ratingContainer}>
        <View style={[styles.presentationCircle, circleStyle]}>
          <Text style={[styles.ratingText, textStyle]}>
            {location.presentation_avg
              ? location.presentation_avg.toFixed(1)
              : "N/A"}
          </Text>
        </View>
        <Text style={[styles.ratingLabel, labelStyle]}>Presentation</Text>
      </View>

      <View style={styles.ratingContainer}>
        <View style={[styles.reviewCircle, circleStyle]}>
          <Text style={[styles.ratingText, textStyle]}>
            {location.total_ratings ?? 0}
          </Text>
        </View>
        <Text style={[styles.ratingLabel, labelStyle]}>Reviews</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  allRatingsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ratingContainer: {
    alignItems: "center",
  },
  overallRatingCircle: {
    backgroundColor: "#B6A3E2",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#B6A3E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  ratingText: {
    fontWeight: "600",
    color: "#fff",
  },
  ratingLabel: {
    fontWeight: "700",
    color: "#666",
    marginTop: 6,
    textAlign: "center",
  },
  tasteCircle: {
    backgroundColor: "#9E9E9E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9E9E9E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  presentationCircle: {
    backgroundColor: "#9E9E9E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9E9E9E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  reviewCircle: {
    backgroundColor: "#9E9E9E",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#9E9E9E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default RatingCircles;
