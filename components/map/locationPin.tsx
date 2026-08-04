import { memo } from "react";
import { Image, Text, View } from "react-native";
import { fonts, makeStyles } from "@/theme";

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
  };
  selected?: boolean;
}

function LocationPin({ loc, selected = false }: LocationPinProps) {
  const styles = useStyles();
  if (loc.lat == null || loc.long == null) return null;

  const reviewed = (loc.total_ratings ?? 0) > 0 && loc.rating != null;
  const showRating = reviewed && !selected;

  return (
    <View
      style={[
        styles.container,
        selected && styles.containerSelected,
      ]}
    >
      <View
        style={[
          styles.pin,
          reviewed && styles.pinReviewed,
          !reviewed && styles.pinUnrated,
          selected && styles.pinSelected,
        ]}
      >
        {showRating ? (
          <Text style={styles.pinRating}>{loc.rating?.toFixed(1)}</Text>
        ) : (
          <Image
            source={require("@/assets/images/martini_transparent.png")}
            style={[
              styles.martini,
              reviewed && styles.martiniReviewed,
              !reviewed && styles.martiniUnrated,
              selected && styles.martiniSelected,
            ]}
            resizeMode="contain"
          />
        )}
      </View>
      <View
        style={[
          styles.pointer,
          reviewed && styles.pointerReviewed,
          !reviewed && styles.pointerUnrated,
          selected && styles.pointerSelected,
        ]}
      />
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
    backgroundColor: t.colors.secondary,
    borderWidth: 4,
    borderColor: t.colors.surface,
    ...t.elevation.raised,
  },
  pinReviewed: {
    backgroundColor: t.colors.highlight,
    borderColor: t.colors.secondary,
  },
  pinUnrated: {
    backgroundColor: t.colors.surface,
    borderWidth: 3,
    borderColor: t.colors.borderStrong,
  },
  pinSelected: {
    width: 52,
    height: 52,
    backgroundColor: t.colors.surfaceInkDeep,
    borderWidth: 5,
    borderColor: t.colors.highlight,
  },
  martini: {
    width: 17,
    height: 17,
    tintColor: t.colors.highlight,
  },
  martiniReviewed: {
    tintColor: t.colors.secondary,
  },
  martiniUnrated: {
    tintColor: t.colors.textMuted,
  },
  martiniSelected: {
    width: 23,
    height: 23,
    tintColor: t.colors.highlight,
  },
  pinRating: {
    ...t.typography.label,
    color: t.colors.secondary,
    fontFamily: fonts.black,
    lineHeight: 16,
    fontVariant: ["tabular-nums"] as const,
  },
  pointer: {
    width: 0,
    height: 0,
    marginTop: -1,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 12,
    borderStyle: "solid" as const,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: t.colors.surface,
  },
  pointerReviewed: {
    borderTopColor: t.colors.secondary,
  },
  pointerUnrated: {
    borderTopColor: t.colors.borderStrong,
  },
  pointerSelected: {
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 15,
    borderTopColor: t.colors.highlight,
  },
}));

export default memo(
  LocationPin,
  (previous, next) =>
    previous.selected === next.selected &&
    previous.loc.id === next.loc.id &&
    previous.loc.lat === next.loc.lat &&
    previous.loc.long === next.loc.long &&
    previous.loc.rating === next.loc.rating &&
    previous.loc.total_ratings === next.loc.total_ratings
);
