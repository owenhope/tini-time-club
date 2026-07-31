import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { makeStyles, useTheme } from "@/theme";

interface FavoriteLocationLinkProps {
  location: { id: number; name: string } | null;
}

/**
 * The labeled "Favorite Location" link shown on both profile screens.
 * Navigates to the place's screen. Renders nothing when there is no
 * favorite location.
 */
const FavoriteLocationLink = ({ location }: FavoriteLocationLinkProps) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  if (!location) return null;

  return (
    <View style={styles.favoriteLocationBlock}>
      <Text style={styles.favoritesLabel}>Favorite Location</Text>
      <TouchableOpacity
        onPress={() => router.push(`/places/${location.id}`)}
        style={styles.favoriteLocationLink}
        accessibilityRole="link"
        accessibilityLabel={`Favorite location, ${location.name}`}
      >
        <Ionicons name="location" size={16} color={colors.accent} />
        <Text style={styles.favoriteLocationText} numberOfLines={1}>
          {location.name}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  favoriteLocationBlock: {
    // The link centres its text in a 32pt touch target, which already adds
    // ~6pt of visual space below the label — no extra gap on top of that.
    gap: 0,
  },
  favoritesLabel: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  favoriteLocationLink: {
    minHeight: 32,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs,
  },
  favoriteLocationText: {
    ...t.typography.bodyStrong,
    color: t.colors.accent,
    flexShrink: 1,
  },
}));

export default FavoriteLocationLink;
