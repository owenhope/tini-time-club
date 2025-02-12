import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { AirbnbRating } from "react-native-ratings";

interface ReviewValues {
  location?: { name: string; address: string };
  spirit?: string;
  type?: string;
  taste?: number;
  presentation?: number;
  notes?: string;
}

const ReviewRating = ({ value, label }: { value: number; label: string }) => {
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

const Review = ({
  values,
  spirits,
  types,
}: {
  values: ReviewValues;
  spirits: any[];
  types: any[];
}) => {
  return (
    <View style={styles.inputContainer}>
      {Object.entries(values || {}).map(([key, value]) => {
        if (key === "location" && value?.name && value?.address) {
          return (
            <View key={key} style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>{key}</Text>
              <Text style={styles.reviewValue}>
                {value.name}, {value.address}
              </Text>
            </View>
          );
        }

        if (["spirit", "type"].includes(key)) {
          const dataSource = key === "spirit" ? spirits : types;
          const item = dataSource.find((obj) => obj.id === value);
          const displayValue = item ? item.name : "Unknown";

          return (
            <View key={key} style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>{key}:</Text>
              <Text style={styles.reviewValue}>{displayValue}</Text>
            </View>
          );
        }

        if (["notes"].includes(key) && value) {
          return (
            <View key={key} style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>{key}:</Text>
              <Text style={styles.reviewComment}>{value}</Text>
            </View>
          );
        }

        if (key === "presentation" || key === "taste") {
          return (
            <View key={key} style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>{key}:</Text>
              <ReviewRating value={value} label={key} />
            </View>
          );
        }

        return null;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  inputContainer: {
    marginVertical: 20,
    width: "100%",
  },
  reviewItem: {
    marginBottom: 10,
    gap: 5,
  },
  reviewLabel: {
    textTransform: "capitalize",
    fontWeight: "bold",
    fontSize: 16,
    color: "#FFF",
  },
  reviewValue: {
    fontSize: 16,
    color: "#FFF",
    textTransform: "capitalize",
  },
  reviewComment: {
    fontSize: 16,
    color: "#FFF",
  },
});

export default Review;
