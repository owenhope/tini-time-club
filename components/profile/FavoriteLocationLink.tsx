import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { makeStyles } from "@/theme";
import { routes } from "@/utils/routes";

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
  const router = useRouter();

  if (!location) return null;

  return (
    <View style={styles.favoriteLocationBlock}>
      <Text style={styles.favoritesLabel}>Favorite Location</Text>
      <TouchableOpacity
        onPress={() => router.push(routes.place(location.id))}
        style={styles.favoriteLocationLink}
        accessibilityRole="link"
        accessibilityLabel={`Favorite location, ${location.name}`}
      >
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
  // Rendered inside ProfileHeader's deep-green block, so the label and link
  // take paper ink rather than grey or accent text.
  favoritesLabel: {
    ...t.typography.eyebrow,
    color: t.colors.onInk,
  },
  favoriteLocationLink: {
    minHeight: 32,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.xs,
  },
  favoriteLocationText: {
    ...t.typography.bodyStrong,
    color: t.colors.highlight,
    flexShrink: 1,
  },
}));

export default FavoriteLocationLink;
