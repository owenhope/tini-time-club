import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { MartiniIcon } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { GoldenGlassCard } from "@/components/explore/golden-glass-card";
import { routes } from "@/utils/routes";
import { reportError } from "@/utils/log";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";
import {
  getGoldenGlassRecipients,
  type GoldenGlassRecipient,
} from "@/services/goldenGlassService";

export default function GoldenGlassList({
  enabled,
  regionId,
  regionName,
}: {
  enabled: boolean;
  regionId: number | null;
  regionName: string | null;
}) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const nativeTabBarInset = useNativeTabBarContentInset();
  const [rows, setRows] = useState<GoldenGlassRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!enabled || regionId == null) return;
    let active = true;
    // A region change starts a new external rankings request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setFailed(false);
    void getGoldenGlassRecipients(regionId)
      .then((next) => {
        if (active) setRows(next);
      })
      .catch((error) => {
        reportError("Unable to load Golden Glass:", error);
        if (active) {
          setRows([]);
          setFailed(true);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, regionId]);

  const renderItem = ({ item }: { item: GoldenGlassRecipient }) => (
    <GoldenGlassCard
      item={item}
      onPress={() => router.push(routes.place(item.locationId))}
    />
  );

  const intro = (
    <View style={styles.intro}>
      <Text style={styles.introEyebrow}>The Best Martinis in {regionName}</Text>
      <View style={styles.introTitleRow}>
        <MartiniIcon size={22} color={colors.awardGold} filled />
        <Text style={styles.introTitle}>Golden Glass</Text>
        <Pressable
          style={({ pressed }) => [
            styles.infoButton,
            pressed && styles.pressed,
          ]}
          onPress={() => router.push(routes.goldenGlassInfo())}
          accessibilityRole="button"
          accessibilityLabel="How Golden Glass works"
          accessibilityHint="Opens an explanation of how locations qualify and are ranked"
        >
          <Ionicons
            name="information-circle-outline"
            size={22}
            color={colors.awardGold}
          />
        </Pressable>
      </View>
      <Text style={styles.introBody}>
        Places the club is raising a glass to right now.
      </Text>
    </View>
  );

  if (regionId == null) {
    return (
      <EmptyState message="Choose a region to see its current Golden Glass locations." />
    );
  }

  const emptyState = loading ? (
    <View style={styles.state}>
      <ActivityIndicator color={colors.awardGold} />
    </View>
  ) : failed ? (
    <EmptyState message="Golden Glass is taking a quick pause. Try again shortly." />
  ) : (
    <EmptyState message="No locations qualify for Golden Glass here yet." />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={loading || failed ? [] : rows}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.locationId)}
        ListHeaderComponent={intro}
        ListEmptyComponent={emptyState}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: nativeTabBarInset },
        ]}
      />
    </View>
  );
}

function EmptyState({ message }: { message: string }) {
  const styles = useStyles();
  return (
    <View style={styles.state}>
      <Text style={styles.stateText}>{message}</Text>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  intro: {
    paddingHorizontal: t.spacing.gutter,
    paddingTop: t.spacing.lg,
    paddingBottom: t.spacing.sm,
    gap: t.spacing.xs,
  },
  introEyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.awardGold,
  },
  introTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  introTitle: { ...t.typography.display, color: t.colors.text },
  infoButton: {
    width: 44,
    height: 44,
    marginLeft: "auto" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: t.radius.pill,
  },
  introBody: { ...t.typography.body, color: t.colors.textSecondary },
  list: {
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.sm,
    gap: t.spacing.md,
    paddingBottom: t.spacing.xxxl,
  },
  pressed: { opacity: 0.75 },
  state: { padding: t.spacing.xxxl, alignItems: "center" as const },
  stateText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
  },
}));
