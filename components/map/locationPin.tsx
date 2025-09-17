import React from "react";
import { View, Text, StyleSheet } from "react-native";

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
    <View style={styles.container}>
      <View style={styles.pinWrapper}>
        <View style={styles.pin}>
          <Text style={styles.pinText}>
            {loc.rating ? loc.rating.toFixed(1) : "N/A"}
          </Text>
          <View style={styles.pinPointer} />
        </View>
      </View>
    </View>
  );
}

const PIN_COLOR = "#B6A3E2";

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: 40, // same width as the pinWrapper
    height: 40, // same height as the pinWrapper
  },
  pinWrapper: {
    width: 40,
    height: 40,
  },
  pin: {
    position: "absolute",
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
});

export default LocationPin;
