import React, { useCallback, useState } from "react";
import { Text } from "react-native";
import { useFocusEffect } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { recordLocationView } from "@/services/locationViewsService";
import { makeStyles, useTheme } from "@/theme";

export default function LocationViewCount({
  locationId,
  onBrand = false,
  enabled = true,
}: {
  locationId: string | number;
  onBrand?: boolean;
  enabled?: boolean;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const memberId = useProfile().profile?.id;
  const id = String(locationId);
  const [result, setResult] = useState<{
    id: string;
    memberId: string;
    count: number;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !memberId) return;
      let active = true;
      void recordLocationView(id).then((count) => {
        if (active) {
          setResult(count == null ? null : { id, memberId, count });
        }
      });
      return () => {
        active = false;
      };
    }, [enabled, id, memberId])
  );

  if (!result || result.id !== id || result.memberId !== memberId) return null;
  const label = `${result.count.toLocaleString()} ${result.count === 1 ? "view" : "views"}`;
  const color = onBrand ? colors.onHeaderBrand : colors.textMuted;

  return (
    <Text style={[styles.label, { color }]} accessibilityLabel={label}>
      {` · ${label}`}
    </Text>
  );
}

const useStyles = makeStyles((t) => ({
  label: {
    ...t.typography.mono,
  },
}));
