import { Link } from "expo-router";
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { stripNameFromAddress } from "@/utils/helpers";

interface LocationDetailsProps {
  loc: any;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({ loc }) => {
  return (
    <View style={styles.bottomSheetContent}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.titleContainer}>
          <Link href={`/locations/${loc.id}`} asChild>
            <View style={styles.locationLinkContainer}>
              <Text style={styles.locationName} numberOfLines={1}>
                {loc.name || "No name available"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#B6A3E2" />
            </View>
          </Link>
          {loc.address && (
            <Text style={styles.address} numberOfLines={2}>
              {stripNameFromAddress(loc.name, loc.address)}
            </Text>
          )}
          {!loc.address && (
            <Text style={styles.address} numberOfLines={2}>
              No address available
            </Text>
          )}
        </View>
      </View>

      {/* All Ratings in One Row */}
      <View style={styles.allRatingsContainer}>
        <View style={styles.ratingContainer}>
          <View style={styles.overallRatingCircle}>
            <Text style={styles.ratingText}>
              {loc.rating ? loc.rating.toFixed(1) : "N/A"}
            </Text>
          </View>
          <Text style={styles.ratingLabel}>Overall</Text>
        </View>

        <View style={styles.ratingContainer}>
          <View style={styles.tasteCircle}>
            <Text style={styles.ratingText}>
              {loc.taste_avg ? loc.taste_avg.toFixed(1) : "N/A"}
            </Text>
          </View>
          <Text style={styles.ratingLabel}>Taste</Text>
        </View>

        <View style={styles.ratingContainer}>
          <View style={styles.presentationCircle}>
            <Text style={styles.ratingText}>
              {loc.presentation_avg ? loc.presentation_avg.toFixed(1) : "N/A"}
            </Text>
          </View>
          <Text style={styles.ratingLabel}>Presentation</Text>
        </View>

        <View style={styles.ratingContainer}>
          <View style={styles.reviewCircle}>
            <Text style={styles.ratingText}>{loc.total_ratings ?? 0}</Text>
          </View>
          <Text style={styles.ratingLabel}>Reviews</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomSheetContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#fff",
  },

  // Header Section
  headerSection: {
    marginBottom: 16,
    minHeight: 60,
  },
  titleContainer: {
    flexDirection: "column",
  },
  locationLinkContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  locationName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginRight: 6,
  },
  address: {
    fontSize: 15,
    color: "#666",
    lineHeight: 20,
  },
  allRatingsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  ratingContainer: {
    alignItems: "center",
    flex: 1,
  },
  overallRatingCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#B6A3E2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#B6A3E2",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  ratingText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#666",
    marginTop: 6,
    textAlign: "center",
  },

  tasteCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#9E9E9E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#9E9E9E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  presentationCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#9E9E9E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#9E9E9E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
  reviewCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#9E9E9E",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
    shadowColor: "#9E9E9E",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});

export default LocationDetails;
