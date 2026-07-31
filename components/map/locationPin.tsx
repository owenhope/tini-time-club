import { memo } from "react";
import { View, Text } from "react-native";
import { makeStyles } from "@/theme";

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
}

function LocationPin({ loc }: LocationPinProps) {
  const styles = useStyles();
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

const useStyles = makeStyles((t) => ({
  container: {
    position: "relative" as const,
    width: 40, // same width as the pinWrapper
    height: 40, // same height as the pinWrapper
  },
  pinWrapper: {
    width: 40,
    height: 40,
  },
  pin: {
    position: "absolute" as const,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: t.colors.accent,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  pinText: {
    color: t.colors.onAccent,
    fontWeight: "bold" as const,
    fontSize: 13,
  },
  pinPointer: {
    position: "absolute" as const,
    bottom: -10,
    left: "50%" as const,
    transform: [{ translateX: -5 }],
    width: 0,
    height: 0,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: 10,
    borderStyle: "solid" as const,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: t.colors.accent,
  },
}));

export default memo(
  LocationPin,
  (previous, next) =>
    previous.loc.id === next.loc.id &&
    previous.loc.lat === next.loc.lat &&
    previous.loc.long === next.loc.long &&
    previous.loc.rating === next.loc.rating
);
