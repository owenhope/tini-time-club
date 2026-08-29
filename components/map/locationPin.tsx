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
}

function LocationPin({ loc, selected = false }: LocationPinProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  if (loc.lat == null || loc.long == null) return null;

  const reviewed = (loc.total_ratings ?? 0) > 0 && loc.rating != null;
  const showRating = reviewed;

  return (
    <View style={[styles.container, selected && styles.containerSelected]}>
      <View
        style={[
          styles.pin,
          reviewed && styles.pinReviewed,
          !reviewed && styles.pinUnrated,
          selected && styles.pinSelected,
          loc.is_golden_glass && styles.pinGolden,
          loc.is_golden_glass && selected && styles.pinGoldenSelected,
        ]}
      >
        {showRating ? (
          <Text
            style={[
              styles.pinRating,
              selected && styles.pinRatingSelected,
              loc.is_golden_glass && styles.pinRatingGolden,
            ]}
          >
            {loc.rating?.toFixed(1)}
          </Text>
        ) : (
          <MartiniIcon
            size={selected ? 23 : 17}
            color={
              loc.is_golden_glass
                ? colors.onAwardGold
                : selected
                  ? colors.onAccent
                  : reviewed
                    ? colors.textOnImage
                    : colors.textMuted
            }
          />
        )}
        {loc.is_location_verified ? (
          <View
            style={styles.verificationOverlay}
            accessible
            accessibilityLabel="Verified business"
          >
            <MaterialIcons
              name="verified"
              size={selected ? 16 : 13}
              color={colors.accent}
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
            reviewed && styles.pointerReviewed,
            !reviewed && styles.pointerUnrated,
            selected && styles.pointerSelected,
            loc.is_golden_glass && styles.pointerGolden,
            loc.is_golden_glass && selected && styles.pointerGoldenSelected,
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
    backgroundColor: t.colors.tabBarActive,
    borderWidth: 0,
    ...t.elevation.raised,
  },
  pinReviewed: {
    backgroundColor: t.colors.tabBarActive,
  },
  pinUnrated: {
    backgroundColor: t.colors.tabBarActive,
  },
  pinSelected: {
    width: 52,
    height: 52,
    backgroundColor: t.colors.tabBarActive,
  },
  pinGolden: {
    backgroundColor: t.colors.awardGold,
    borderWidth: 2,
    borderColor: t.colors.awardGold,
  },
  pinGoldenSelected: {
    backgroundColor: t.colors.awardGold,
    borderColor: t.colors.awardGold,
  },
  pinRating: {
    ...t.typography.label,
    position: "absolute" as const,
    color: t.colors.textOnImage,
    fontVariant: ["tabular-nums"] as const,
  },
  pinRatingSelected: {
    ...t.typography.caption,
    color: t.colors.onAccent,
  },
  pinRatingGolden: {
    color: t.colors.onAwardGold,
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
    borderTopColor: t.colors.tabBarActive,
  },
  pointerReviewed: {
    borderTopColor: t.colors.tabBarActive,
  },
  pointerUnrated: {
    borderTopColor: t.colors.tabBarActive,
  },
  pointerSelected: {
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 15,
    borderTopColor: t.colors.tabBarActive,
  },
  pointerGolden: {
    borderTopColor: t.colors.awardGold,
  },
  pointerGoldenSelected: {
    borderTopColor: t.colors.awardGold,
  },
  verificationOverlay: {
    position: "absolute" as const,
    right: -3,
    top: -3,
    width: 17,
    height: 17,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surface,
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
    previous.loc.total_ratings === next.loc.total_ratings &&
    previous.loc.is_golden_glass === next.loc.is_golden_glass &&
    previous.loc.is_location_verified === next.loc.is_location_verified
);
