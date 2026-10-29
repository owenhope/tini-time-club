import { memo } from "react";
import { Text, View } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { MartiniIcon } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";

interface LocationPinProps {
  loc: {
    lat: number | null;
    long: number | null;
    id: number | string;
    name: string;
    rating?: number | null;
    total_ratings?: number | null;
    taste_avg?: number | null;
    presentation_avg?: number | null;
    address?: string | null;
    is_golden_glass?: boolean;
    is_location_verified?: boolean;
  };
  selected?: boolean;
  count?: number;
  /** One of the viewer's liked places: the ring and pointer turn pink. */
  favorite?: boolean;
}

/**
 * Every pin wears the same outline treatment — a tonal fill tinted from the
 * ring colour so pins stand off the basemap in either theme, with the ring's
 * colour carried into the rating and pointer. Brand purple is the standard
 * pin; verification deepens the purple (plus the check overlay), and Golden
 * Glass goes gold, which wins when both apply. A liked place goes pink the
 * same way — tonal fill, ring, rating and pointer — over purple. Gold is an
 * award, so a liked Golden Glass place stays gold and carries a pink heart on
 * its corner instead, the way verification carries its check.
 */
function LocationPin({
  loc,
  selected = false,
  count,
  favorite = false,
}: LocationPinProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (loc.lat == null || loc.long == null) return null;

  const reviewed = (loc.total_ratings ?? 0) > 0 && loc.rating != null;
  const showRating = reviewed;
  const pink = favorite && !loc.is_golden_glass;
  const heartBadge = favorite && Boolean(loc.is_golden_glass);

  return (
    <View style={[styles.container, selected && styles.containerSelected]}>
      <View
        style={[
          styles.pin,
          selected && styles.pinSelected,
          loc.is_location_verified && styles.pinVerified,
          loc.is_golden_glass && styles.pinGolden,
          pink && styles.pinFavorite,
        ]}
      >
        {count != null || showRating ? (
          <Text
            style={[
              styles.pinRating,
              selected && styles.pinRatingSelected,
              loc.is_location_verified && styles.pinRatingVerified,
              loc.is_golden_glass && styles.pinRatingGolden,
              pink && styles.pinRatingFavorite,
            ]}
          >
            {count ?? loc.rating?.toFixed(1)}
          </Text>
        ) : (
          <MartiniIcon
            size={selected ? 23 : 17}
            color={
              pink
                ? colors.onFavoriteSurface
                : loc.is_golden_glass
                  ? colors.awardGoldForeground
                  : loc.is_location_verified
                    ? colors.onAccentTonal
                    : colors.accent
            }
          />
        )}
        {loc.is_location_verified && count == null ? (
          <View
            style={styles.verificationOverlay}
            accessible
            accessibilityLabel="Verified business"
          >
            <MaterialIcons
              name="verified"
              size={selected ? 16 : 13}
              color={colors.verified}
            />
          </View>
        ) : null}
        {heartBadge ? (
          <View
            style={[styles.verificationOverlay, styles.favoriteOverlay]}
            accessible
            accessibilityLabel="In your Favorites"
          >
            <MaterialIcons
              name="favorite"
              size={selected ? 17 : 14}
              color={colors.favorite}
            />
          </View>
        ) : null}
      </View>
      <View
        style={[styles.pointerFrame, selected && styles.pointerFrameSelected]}
      >
        <View
          style={[
            styles.pointer,
            selected && styles.pointerSelected,
            loc.is_location_verified && styles.pointerVerified,
            loc.is_golden_glass && styles.pointerGolden,
            pink && styles.pointerFavorite,
          ]}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    width: 52,
    height: 64,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
  },
  containerSelected: {
    width: 70,
    height: 80,
  },
  pin: {
    width: 38,
    height: 38,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentTonal,
    borderWidth: 3,
    borderColor: t.colors.brandPurple,
    ...t.elevation.raised,
  },
  pinSelected: {
    width: 52,
    height: 52,
  },
  pinVerified: {
    backgroundColor: t.colors.verifiedSurface,
    borderColor: t.colors.verified,
  },
  pinGolden: {
    backgroundColor: t.colors.awardGoldSurface,
    borderColor: t.colors.awardGold,
  },
  pinFavorite: {
    backgroundColor: t.colors.favoriteSurface,
    borderColor: t.colors.favorite,
  },
  pinRating: {
    ...t.typography.label,
    position: "absolute" as const,
    color: t.colors.accent,
    fontVariant: ["tabular-nums"] as const,
  },
  pinRatingSelected: {
    // bodyStrong keeps the selected rating heavy at the larger size without
    // reaching for a raw fontFamily outside the semantic roles.
    ...t.typography.bodyStrong,
    color: t.colors.accent,
  },
  pinRatingVerified: {
    // onAccentTonal is the readable purple step for tonal purple fills in
    // both themes (purple-700 on light, purple-300 on dark).
    color: t.colors.onAccentTonal,
  },
  pinRatingGolden: {
    color: t.colors.awardGoldForeground,
  },
  pinRatingFavorite: {
    color: t.colors.onFavoriteSurface,
  },
  pointerFrame: {
    width: 18,
    height: 13,
    alignItems: "center" as const,
    marginTop: -1,
  },
  pointerFrameSelected: {
    width: 22,
    height: 16,
  },
  pointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderStyle: "solid" as const,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: t.colors.brandPurple,
  },
  pointerSelected: {
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 15,
  },
  pointerVerified: {
    borderTopColor: t.colors.verified,
  },
  pointerGolden: {
    borderTopColor: t.colors.awardGold,
  },
  pointerFavorite: {
    borderTopColor: t.colors.favorite,
  },
  verificationOverlay: {
    position: "absolute" as const,
    right: -5,
    top: -5,
    width: 17,
    height: 17,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surface,
  },
  // Opposite the verification check so a place can wear both.
  // Just the heart: no backing disc, unlike the check it sits opposite. Kept
  // inside the marker's top edge, which clips the native snapshot.
  favoriteOverlay: {
    right: undefined,
    left: -6,
    top: -1,
    backgroundColor: "transparent",
  },
}));

export default memo(
  LocationPin,
  (previous, next) =>
    previous.selected === next.selected &&
    previous.count === next.count &&
    previous.favorite === next.favorite &&
    previous.loc.id === next.loc.id &&
    previous.loc.lat === next.loc.lat &&
    previous.loc.long === next.loc.long &&
    previous.loc.rating === next.loc.rating &&
    previous.loc.total_ratings === next.loc.total_ratings &&
    previous.loc.is_golden_glass === next.loc.is_golden_glass &&
    previous.loc.is_location_verified === next.loc.is_location_verified
);
