import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { AppText, PassportIcon } from "@/components/shared";
import { PassportStamp } from "@/components/passport/passport-stamp";
import { usePassport } from "@/hooks/usePassport";
import { makeStyles, useTheme } from "@/theme";
import { routes } from "@/utils/routes";

export interface PassportEntryProps {
  /** Show another member's Passport instead of the signed-in member's. */
  profileId?: string;
  username?: string;
  /**
   * Fresh points from the Passport load. Viewing a member reconciles them
   * server-side, so the surrounding profile's stale passport_points (rank
   * bar, ring) can catch up without a second visit.
   */
  onPointsLoaded?: (points: number) => void;
}

export function PassportEntry({
  profileId,
  username,
  onPointsLoaded,
}: PassportEntryProps) {
  const { passport, loading } = usePassport(profileId);
  const ownerLabel = profileId ? `${username ?? "Member"}'s` : "Your";
  const router = useRouter();
  const longPressHandled = useRef(false);
  const styles = useStyles();
  const { colors } = useTheme();
  const [preview, setPreview] = useState<"live" | "empty" | "loading">("live");
  const points = passport?.points;
  useEffect(() => {
    if (points != null) onPointsLoaded?.(points);
  }, [onPointsLoaded, points]);
  const displayedPassport = preview === "empty" ? null : passport;
  const showSkeleton = preview === "loading" || (loading && !passport);
  const recent = [...(displayedPassport?.stamps ?? [])]
    .filter((stamp) => stamp.earned)
    .sort((a, b) => (b.awardedAt ?? "").localeCompare(a.awardedAt ?? ""))
    .slice(0, 3);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${ownerLabel} Martini Passport, ${displayedPassport?.points ?? 0} points`}
      onPress={() => {
        if (longPressHandled.current) {
          longPressHandled.current = false;
          return;
        }
        router.push(
          routes.passport(profileId ? { profileId, username } : undefined)
        );
      }}
      onLongPress={
        __DEV__
          ? () => {
              longPressHandled.current = true;
              setPreview((current) =>
                current === "live"
                  ? "empty"
                  : current === "empty"
                    ? "loading"
                    : "live"
              );
            }
          : undefined
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.header}>
        <AppText variant="eyebrow" style={styles.eyebrow}>
          {ownerLabel} Passport
        </AppText>
        {showSkeleton ? (
          <View style={[styles.headerSkeleton, styles.points]} />
        ) : (
          <AppText variant="label" style={[styles.text, styles.points]}>
            {displayedPassport?.points ?? 0} pts
          </AppText>
        )}
        <Ionicons
          name="chevron-forward"
          size={14}
          color={colors.onHeaderBrand}
        />
      </View>
      {showSkeleton ? (
        <PassportEntrySkeleton />
      ) : recent.length ? (
        <View
          style={styles.grid}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          {recent.map((stamp) => (
            <View key={stamp.id} style={styles.cell}>
              <PassportStamp
                shape={stamp.metric}
                milestone={stamp.threshold}
                pointAward={stamp.points}
                earned
                label={(stamp.label || stamp.title).replace(/^\d+\s+/, "")}
                appearance="profile"
              />
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.empty}>
          <PassportIcon size={23} color={colors.onHeaderBrand} />
          <View style={styles.emptyCopy}>
            <AppText variant="label" style={styles.text}>
              {profileId
                ? "No stamps earned yet"
                : "Your first stamp is waiting"}
            </AppText>
            <AppText variant="caption" style={styles.muted}>
              {profileId
                ? "Their Passport starts with their first review."
                : "Publish a review to start your Passport."}
            </AppText>
          </View>
        </View>
      )}
    </Pressable>
  );
}

function PassportEntrySkeleton() {
  const styles = useStyles();
  const [opacity] = useState(() => new Animated.Value(0.38));

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.72,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.38,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[styles.skeletonGrid, { opacity }]}
      accessibilityLabel="Loading Passport stamps"
    >
      {[0, 1, 2].map((index) => (
        <View key={index} style={styles.skeletonCell}>
          <View style={styles.skeletonRing} />
          <View style={styles.skeletonLine} />
        </View>
      ))}
    </Animated.View>
  );
}

const useStyles = makeStyles((t) => ({
  card: {
    width: "100%" as const,
    padding: t.spacing.md,
    gap: t.spacing.sm,
    backgroundColor: "rgba(250,249,246,0.10)",
    borderRadius: t.radius.card,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  text: { color: t.colors.onHeaderBrand },
  eyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.onHeaderBrand,
    opacity: 0.72,
  },
  muted: {
    color: t.colors.onHeaderBrand,
    opacity: 0.72,
  },
  points: { marginLeft: "auto" as const },
  headerSkeleton: {
    width: 42,
    height: 9,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.onHeaderBrand,
    opacity: 0.48,
  },
  grid: { flexDirection: "row" as const, gap: t.spacing.xs },
  cell: { flex: 1, minWidth: 0 },
  empty: {
    minHeight: 100,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.sm,
    paddingBottom: t.spacing.sm,
  },
  emptyCopy: { flex: 1, gap: 2 },
  skeletonGrid: {
    height: 100,
    flexDirection: "row" as const,
    gap: t.spacing.xs,
  },
  skeletonCell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    position: "relative" as const,
  },
  skeletonRing: {
    width: 78,
    height: 78,
    borderRadius: t.radius.pill,
    borderWidth: 2,
    borderColor: t.colors.onHeaderBrand,
  },
  skeletonLine: {
    position: "absolute" as const,
    width: 40,
    height: 5,
    top: 62,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.onHeaderBrand,
  },
  pressed: { opacity: 0.75 },
}));
