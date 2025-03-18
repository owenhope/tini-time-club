import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

interface LocationPinProps {
  loc: {
    lat: number | null;
    long: number | null;
    name: string;
    rating?: number;
    total_ratings?: number;
    taste_avg?: number;
    presentation_avg?: number;
    address?: string;
  };
  isSelected: boolean;
  onPress: () => void;
  onClose: () => void;
  onView: () => void;
}

function LocationPin({
  loc,
  isSelected,
  onPress,
  onClose,
  onView,
}: LocationPinProps) {
  if (loc.lat == null || loc.long == null) return null;

  return (
    <TouchableOpacity onPress={onPress}>
      {isSelected ? (
        /* Expanded View */
        <View style={styles.expandedMarker}>
          <View style={styles.headerContainer}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerText}>{loc.name}</Text>
              <Text style={styles.reviewText}>
                ({loc.total_ratings ?? 0} reviews)
              </Text>
            </View>
            <View style={styles.ratingCircle}>
              <Text style={styles.circleText}>
                {loc.rating ? loc.rating.toFixed(1) : "N/A"}
              </Text>
            </View>
          </View>

          <View style={styles.detailsContainer}>
            <View style={styles.circleContainer}>
              <View style={styles.tasteCircle}>
                <Text style={styles.circleText}>
                  {loc.taste_avg ? loc.taste_avg.toFixed(1) : "N/A"}
                </Text>
              </View>
              <Text style={styles.circleLabel}>Taste</Text>
            </View>
            <View style={styles.circleContainer}>
              <View style={styles.presentationCircle}>
                <Text style={styles.circleText}>
                  {loc.presentation_avg
                    ? loc.presentation_avg.toFixed(1)
                    : "N/A"}
                </Text>
              </View>
              <Text style={styles.circleLabel}>Presentation</Text>
            </View>
          </View>

          {loc.address && <Text style={styles.addressText}>{loc.address}</Text>}

          <View style={styles.actionContainer}>
            <TouchableOpacity onPress={onView}>
              <Text style={styles.viewLink}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButtonTextBottom}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.markerContainer}>
          <View style={styles.pin}>
            <Text style={styles.pinText}>
              {loc.rating ? loc.rating.toFixed(1) : "N/A"}
            </Text>
            <View style={styles.pinPointer} />
          </View>
          <Text style={styles.restaurantName}>{loc.name}</Text>
        </View>
      )}
    </TouchableOpacity>
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

  /* ----- EXPANDED MARKER STYLES ----- */
  expandedMarker: {
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#2E86AB",
    alignItems: "center",
    zIndex: 9999,
    maxWidth: 220,
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
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  reviewText: {
    fontSize: 12,
    color: "#555",
  },
  ratingCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#2E86AB",
    justifyContent: "center",
    alignItems: "center",
  },
  circleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  detailsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginVertical: 6,
  },
  circleContainer: {
    alignItems: "center",
    width: 60,
  },
  tasteCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "olive",
    justifyContent: "center",
    alignItems: "center",
  },
  presentationCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "silver",
    justifyContent: "center",
    alignItems: "center",
  },
  circleLabel: {
    fontSize: 10,
    color: "#333",
    marginTop: 2,
    textAlign: "center",
  },
  addressText: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    marginBottom: 6,
  },
  actionContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 6,
  },
  viewLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2E86AB",
    textDecorationLine: "underline",
  },
  closeButtonTextBottom: {
    fontSize: 14,
    fontWeight: "600",
    color: "red",
    textDecorationLine: "underline",
  },
});

export default LocationPin;
