import React, { useState } from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { getHomeCityCoordinates } from "@/services/homeCityService";
import { cityLabel, type HomeCity } from "@/utils/homeCity";
import { makeStyles, useTheme } from "@/theme";
import { routes } from "@/utils/routes";

/**
 * A member's home city as a labeled link, styled like the favorite-location
 * link: a "Home City" eyebrow above a pin and the city name.
 * Shows the city name only; VoiceOver gets the full city, region, country.
 * Opens Explore's map framed on that city. Coordinates are looked up on tap
 * because profiles store the city only.
 */
export default function HomeCityLink({ city }: { city: HomeCity }) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const label = cityLabel(city);

  const open = async () => {
    if (opening) return;
    setOpening(true);
    try {
      const coordinates = await getHomeCityCoordinates(city);
      // navigate, not push: switches to Explore's map rather than stacking a
      // tab root with no back button.
      router.navigate(
        coordinates
          ? routes.discover({
              view: "map",
              lat: coordinates.lat.toString(),
              lon: coordinates.lon.toString(),
              scope: "city",
            })
          : routes.discover({ view: "map" })
      );
    } finally {
      setOpening(false);
    }
  };

  return (
    <View style={styles.block}>
      <Text
        style={styles.label}
        importantForAccessibility="no"
        accessibilityElementsHidden
      >
        Home City
      </Text>
      <TouchableOpacity
        onPress={() => void open()}
        disabled={opening}
        style={styles.link}
        accessibilityRole="link"
        accessibilityLabel={`Home city, ${label}`}
        accessibilityHint="Shows this city on the Explore map"
        accessibilityState={{ busy: opening }}
      >
        <Ionicons name="location-sharp" size={18} color={colors.highlight} />
        <Text style={styles.text} numberOfLines={1}>
          {city.name}
        </Text>
        {opening ? (
          <ActivityIndicator size="small" color={colors.highlight} />
        ) : null}
      </TouchableOpacity>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  // The link centres its text in a 32pt touch target, which already spaces
  // it from the label, matching FavoriteLocationLink.
  block: {
    gap: 0,
  },
  label: {
    ...t.typography.eyebrow,
    color: t.colors.onInk,
  },
  link: {
    minHeight: 32,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    alignSelf: "flex-start" as const,
    gap: t.spacing.xs,
  },
  // Same treatment as FavoriteLocationLink on the deep header ground.
  text: {
    ...t.typography.bodyStrong,
    color: t.colors.highlight,
    flexShrink: 1,
  },
}));
