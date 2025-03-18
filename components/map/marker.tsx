import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Marker as MapMarker } from "react-native-maps";
import { FontAwesome5 } from "@expo/vector-icons";

interface MapMarkerProps {
  loc: any;
  index: number;
  isSelected: boolean;
  onPress: () => void;
}

function Marker({ loc, index, isSelected, onPress }: MapMarkerProps) {
  if (loc.lat == null || loc.long == null) return null;
  console.log(loc);
  return (
    <MapMarker
      coordinate={{ latitude: loc.lat, longitude: loc.long }}
      onPress={onPress}
    >
      {isSelected ? (
        <View style={styles.expandedMarker}>
          <Text style={styles.expandedName}>{loc.name}</Text>
          <Text style={styles.expandedRating}>
            Rating: {loc.rating ? loc.rating.toFixed(1) : "N/A"} (
            {loc.total_ratings})
          </Text>
          <Text style={styles.expandedRating}>
            Taste: {loc.taste_avg ? loc.taste_avg.toFixed(1) : "N/A"}
          </Text>
          <Text style={styles.expandedRating}>
            Presentation:{" "}
            {loc.presentation_avg ? loc.presentation_avg.toFixed(1) : "N/A"}
          </Text>
          <Text style={styles.expandedInfo}>{loc.address}</Text>
        </View>
      ) : (
        <View style={styles.markerContainer}>
          <View style={styles.bubble}>
            <Text style={styles.bubbleText}>{loc.name}</Text>
            <View style={styles.ratingCircle}>
              <Text style={styles.ratingCircleText}>
                {loc.rating ? loc.rating.toFixed(1) : "N/A"}
              </Text>
            </View>
          </View>
          <View style={styles.markerPin}>
            <FontAwesome5 name="glass-martini-alt" size={20} color="silver" />
          </View>
        </View>
      )}
    </MapMarker>
  );
}

const styles = StyleSheet.create({
  markerContainer: {
    alignItems: "center",
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderColor: "#2E86AB",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginBottom: 2,
  },
  bubbleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginRight: 6,
  },
  ratingCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#2E86AB",
    justifyContent: "center",
    alignItems: "center",
  },
  ratingCircleText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#fff",
  },
  markerPin: {
    // This view wraps the icon.
  },
  expandedMarker: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2E86AB",
    alignItems: "center",
    zIndex: 1000,
    maxWidth: 200,
  },
  expandedName: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  expandedRating: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
  },
  expandedInfo: {
    fontSize: 12,
    color: "#555",
  },
});

export default Marker;
