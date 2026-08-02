import React from "react";
import { View, Text } from "react-native";
import { fonts, makeStyles } from "@/theme";
import type { NamedOption } from "@/types/types";

/**
 * favorite_spirits / favorite_types are id arrays, but legacy rows may hold a
 * JSON string — parse defensively either way.
 */
export const parseFavoriteIds = (
  value: (number | string)[] | string | null | undefined
): (number | string)[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
};

interface FavoriteTagsProps {
  profile: {
    favorite_spirits?: (number | string)[] | string | null;
    favorite_types?: (number | string)[] | string | null;
  } | null;
  spirits: NamedOption[];
  types: NamedOption[];
}

/**
 * The right-aligned "Spirit" / "Type" chip row shown on both the own-profile
 * and visited-profile headers. Renders nothing when the profile has no
 * favorites.
 */
const FavoriteTags = ({ profile, spirits, types }: FavoriteTagsProps) => {
  const styles = useStyles();

  const favoriteSpirits = parseFavoriteIds(profile?.favorite_spirits);
  const favoriteTypes = parseFavoriteIds(profile?.favorite_types);

  if (favoriteSpirits.length === 0 && favoriteTypes.length === 0) {
    return null;
  }

  const getSpiritName = (id: number | string) => {
    const spirit = spirits.find((s) => String(s.id) === String(id));
    return spirit?.name || String(id);
  };

  const getTypeName = (id: number | string) => {
    const type = types.find((t) => String(t.id) === String(id));
    return type?.name || String(id);
  };

  return (
    <View style={styles.favoritesTagsBlock}>
      {favoriteSpirits.length > 0 && (
        <View style={styles.favoritesTagsGroup}>
          <Text style={styles.favoritesLabel}>Spirit</Text>
          <View style={styles.favoritesTagsContainer}>
            {favoriteSpirits.map((spiritId) => (
              <View key={`spirit-${spiritId}`} style={styles.tag}>
                <Text style={styles.tagText}>{getSpiritName(spiritId)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
      {favoriteTypes.length > 0 && (
        <View style={styles.favoritesTagsGroup}>
          <Text style={styles.favoritesLabel}>Type</Text>
          <View style={styles.favoritesTagsContainer}>
            {favoriteTypes.map((typeId) => (
              <View key={`type-${typeId}`} style={styles.tag}>
                <Text style={styles.tagText}>{getTypeName(typeId)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  favoritesTagsBlock: {
    // One row always: the Spirit and Type groups sit side by side and their
    // chips wrap vertically within each group instead of stacking the groups.
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    alignItems: "flex-start" as const,
    gap: t.spacing.lg,
  },
  favoritesTagsGroup: {
    flexShrink: 1,
    alignItems: "flex-start" as const,
    gap: 6,
  },
  favoritesLabel: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  favoritesTagsContainer: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    gap: t.spacing.sm,
    justifyContent: "flex-end" as const,
  },
  tag: {
    paddingVertical: 6,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accent,
  },
  tagText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.colors.onAccent,
    textTransform: "capitalize" as const,
  },
}));

export default FavoriteTags;
