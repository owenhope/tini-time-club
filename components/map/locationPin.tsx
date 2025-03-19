import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Link } from "expo-router";

interface LocationPinProps {
  loc: {
    lat: number | null;
    long: number | null;
    id: string;
    name: string;
    rating?: number;
    total_ratings?: number;
    taste_avg?: number;
    presentation_avg?: number;
    address?: string;
  };
}

function LocationPin({ loc }: LocationPinProps) {
  if (loc.lat == null || loc.long == null) return null;
  return (
    <View>
      <View style={styles.markerContainer}>
        <View style={styles.pin}>
          <Text style={styles.pinText}>
            {loc.rating ? loc.rating.toFixed(1) : "N/A"}
          </Text>
          <View style={styles.pinPointer} />
        </View>
        <Text style={styles.restaurantName}>{loc.name}</Text>
      </View>
    </View>
  );
}

const PIN_COLOR = "#2E86AB";
const styles = StyleSheet.create({
  markerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  pin: {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PIN_COLOR,
    justifyContent: "center",
    alignItems: "center",
  },
  pinText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  pinPointer: {
    position: "absolute",
    bottom: -10,
    left: "50%",
    transform: [{ translateX: -5 }],
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 10,
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: PIN_COLOR,
  },
  restaurantName: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
    color: "#FFF",
  },
});

export default LocationPin;
