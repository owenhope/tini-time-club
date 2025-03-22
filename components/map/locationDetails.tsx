import { Link } from "expo-router";
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

interface LocationDetailsProps {
  loc: any;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({ loc }) => {
  return (
    <View style={styles.bottomSheetContent}>
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Link href={`/discover/${loc.id}`} asChild>
            <Text style={styles.headerText}>{loc.name}</Text>
          </Link>
          <Text style={styles.reviewText}>
            ({loc.total_ratings ?? 0} reviews)
          </Text>
          {loc.address && <Text style={styles.addressText}>{loc.address}</Text>}
        </View>
        <View style={styles.ratingCircle}>
          <Text style={styles.circleText}>
            {loc.rating ? loc.rating.toFixed(1) : "N/A"}
          </Text>
        </View>
      </View>
      <View style={styles.detailsContainer}>
        <View style={styles.circleContainer}>
          <Text style={styles.circleLabel}>Taste</Text>
          <View style={styles.tasteCircle}>
            <Text style={styles.circleText}>
              {loc.taste_avg ? loc.taste_avg.toFixed(1) : "N/A"}
            </Text>
          </View>
        </View>
        <View style={styles.circleContainer}>
          <Text style={styles.circleLabel}>Presentation</Text>
          <View style={styles.presentationCircle}>
            <Text style={styles.circleText}>
              {loc.presentation_avg ? loc.presentation_avg.toFixed(1) : "N/A"}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomSheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    paddingBottom: 6,
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: "column",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
  },
  addressText: {
    fontSize: 16,
    marginTop: 4,
  },
  reviewText: {
    fontSize: 14,
    color: "#555",
    marginVertical: 2,
  },
  ratingCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2E86AB",
    justifyContent: "center",
    alignItems: "center",
  },
  circleText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  detailsContainer: {
    flexDirection: "column",
    gap: 16, // use marginBottom on children if gap is not supported
    marginTop: 16,
  },
  circleContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  circleLabel: {
    fontSize: 18,
    fontWeight: "bold",
    flex: 1,
    textAlign: "left",
  },
  tasteCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "olive",
    justifyContent: "center",
    alignItems: "center",
  },
  presentationCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "silver",
    justifyContent: "center",
    alignItems: "center",
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "center",
    width: "100%",
    marginTop: 16,
  },
  button: {
    backgroundColor: "#000",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default LocationDetails;
