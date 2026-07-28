import React from "react";
import { View, Text } from "react-native";
import { makeStyles } from "@/theme";

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
  const styles = useStyles();

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

const useStyles = makeStyles((t) => ({
  allRatingsContainer: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  ratingContainer: {
    alignItems: "center" as const,
  },
  overallRatingCircle: {
    backgroundColor: t.colors.accent,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    ...t.elevation.card,
  },
  ratingText: {
    fontWeight: "600" as const,
    // onAccent / onSecondary resolve to the same value per scheme, so one
    // token covers the text in all four circles.
    color: t.colors.onAccent,
  },
  ratingLabel: {
    fontWeight: "700" as const,
    color: t.colors.textSecondary,
    marginTop: 6,
    textAlign: "center" as const,
  },
  tasteCircle: {
    backgroundColor: t.colors.secondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    ...t.elevation.card,
  },
  presentationCircle: {
    backgroundColor: t.colors.secondary,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    ...t.elevation.card,
  },
  reviewCircle: {
    backgroundColor: t.colors.danger,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    ...t.elevation.card,
  },
}));

export default RatingCircles;
