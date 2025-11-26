import { Link } from "expo-router";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { stripNameFromAddress } from "@/utils/helpers";
import RatingCircles from "@/components/RatingCircles";

interface LocationDetailsProps {
  loc: any;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({ loc }) => {
  return (
    <View style={styles.bottomSheetContent}>
      {/* Header Section */}
      <View style={styles.headerSection}>
        <View style={styles.titleContainer}>
          <Link href={`/(tabs)/locations/${loc.id}`} asChild>
            <TouchableOpacity style={styles.locationLinkContainer}>
              <Text style={styles.locationName} numberOfLines={1}>
                {loc.name || "No name available"}
              </Text>
              <Ionicons name="chevron-forward" size={16} color="#B6A3E2" />
            </TouchableOpacity>
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
      <RatingCircles location={loc} circleSize={44} />
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
});

export default LocationDetails;
