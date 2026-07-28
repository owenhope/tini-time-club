import { Link } from "expo-router";
import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { stripNameFromAddress } from "@/utils/helpers";
import RatingCircles from "@/components/RatingCircles";
import { makeStyles, useTheme } from "@/theme";

interface LocationDetailsProps {
  loc: any;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({ loc }) => {
  const styles = useStyles();
  const { colors } = useTheme();

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
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.accent}
              />
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

const useStyles = makeStyles((t) => ({
  bottomSheetContent: {
    paddingHorizontal: t.spacing.xl - 4,
    paddingVertical: t.spacing.xl - 4,
    backgroundColor: t.colors.surface,
  },

  // Header Section
  headerSection: {
    marginBottom: t.spacing.lg,
    minHeight: 60,
  },
  titleContainer: {
    flexDirection: "column" as const,
  },
  locationLinkContainer: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    marginBottom: t.spacing.xs,
  },
  locationName: {
    ...t.typography.title,
    color: t.colors.text,
    marginRight: 6,
  },
  address: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    lineHeight: 20,
  },
}));

export default LocationDetails;
