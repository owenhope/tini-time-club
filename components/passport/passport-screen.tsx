import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { AppText, PassportIcon } from "@/components/shared";
import { PassportStamp } from "@/components/passport/passport-stamp";
import { usePassport } from "@/hooks/usePassport";
import { makeStyles, useTheme } from "@/theme";
import { useNativeTabBarContentInset } from "@/utils/native-tab-bar-insets";
import { getRankProgress } from "@/utils/ranking";
import { routes } from "@/utils/routes";

const MARTINI_STYLE_HINTS: Record<string, string> = {
  Vodka: "Clean, crisp martinis built on vodka.",
  Gin: "Botanical martinis built on gin.",
  Vesper: "The 007 order — gin and vodka with a wine aperitif.",
  Twist: "Bright martinis finished with a citrus twist.",
  Dirty: "Savory martinis made with olive brine.",
  Dry: "Spirit-forward martinis with less vermouth.",
  Gibson: "Savory martinis finished with a cocktail onion.",
  Espresso: "Coffee-forward martinis with a rich finish.",
  Classic: "Balanced, timeless martinis in the classic style.",
  Wet: "Silky martinis made with a more generous pour of vermouth.",
  Filthy: "Extra-briny martinis for serious olive lovers.",
  "50/50": "Equal parts spirit and vermouth for a softer sip.",
};

const styleNameFromTitle = (title: string) =>
  title.replace(/\s+milestones$/i, "");

const passportSection = (metric: string, series: string) => {
  if (metric === "locations" || metric === "regulars") return "Venues";
  if (
    metric === "martinis" ||
    metric === "combination" ||
    metric === "type_reviews" ||
    metric === "spirit_reviews"
  ) {
    return "Martinis";
  }
  return series;
};

const SECTION_ORDER = ["Profile", "Venues", "Martinis", "Community"];
// Sections outside SECTION_ORDER (a new server-side series, say) sort after
// the known ones instead of jumping above "Venues".
const sectionRank = (title: string) => {
  const index = SECTION_ORDER.indexOf(title);
  return index === -1 ? SECTION_ORDER.length : index;
};

// How far past the top a pull has to travel to count as pull-to-refresh —
// roughly where UIRefreshControl's own trigger sits.
const PULL_REFRESH_DISTANCE = 90;
// The refresh indicator stays up at least this long, so a fast response
// still reads as a refresh.
const MIN_REFRESH_SPINNER_MS = 650;

export default function PassportScreen() {
  const router = useRouter();
  const { stampKey } = useLocalSearchParams<{ stampKey?: string }>();
  const { passport, error, refresh } = usePassport();
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const scrollRef = useRef<ScrollView>(null);
  const linkedGroupRef = useRef<View>(null);
  const scrollOffsetRef = useRef(0);
  const scrolledStampKeyRef = useRef<string | undefined>(undefined);
  const styles = useStyles();
  const { colors } = useTheme();
  const bottom = useNativeTabBarContentInset();
  const passportPoints = passport?.points ?? 0;
  const rank = getRankProgress(passportPoints);
  const sections = useMemo(() => {
    const result = new Map<
      string,
      Map<string, NonNullable<typeof passport>["stamps"]>
    >();
    for (const stamp of passport?.stamps ?? []) {
      const sectionTitle = passportSection(stamp.metric, stamp.section);
      const section = result.get(sectionTitle) ?? new Map();
      section.set(stamp.title, [...(section.get(stamp.title) ?? []), stamp]);
      result.set(sectionTitle, section);
    }
    return [...result]
      .map(([title, groups]) => ({ title, groups: [...groups] }))
      .sort((a, b) => sectionRank(a.title) - sectionRank(b.title));
  }, [passport]);

  // The native RefreshControl never fires under the native tab bar on SDK 57,
  // so the pull is detected from scroll offsets and answered with a floating
  // spinner — the same pattern as the home feed. The pull gesture is the only
  // writer of `refreshing`; focus-triggered loads only toggle `loading`.
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const pullArmedRef = useRef(false);
  const onRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    refreshingRef.current = true;
    setRefreshing(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      // The refresh often resolves in under a frame or two of the release;
      // holding the indicator briefly is what makes the pull feel answered.
      await Promise.all([
        refresh(),
        new Promise((resolve) => setTimeout(resolve, MIN_REFRESH_SPINNER_MS)),
      ]);
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [refresh]);

  const scrollToLinkedAchievement = useCallback(() => {
    if (!stampKey || scrolledStampKeyRef.current === stampKey) return;
    requestAnimationFrame(() => {
      linkedGroupRef.current?.measure(
        (_x, _y, _width, _height, _pageX, pageY) => {
          scrollRef.current
            ?.getNativeScrollRef()
            ?.measure((_sx, _sy, _sw, _sh, _spx, scrollPageY) => {
              scrolledStampKeyRef.current = stampKey;
              scrollRef.current?.scrollTo({
                y: Math.max(
                  0,
                  scrollOffsetRef.current + pageY - scrollPageY - 12
                ),
                animated: true,
              });
            });
        }
      );
    });
  }, [stampKey]);

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollRef}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.content, { paddingBottom: bottom + 24 }]}
        onScroll={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const y = event.nativeEvent.contentOffset.y;
          scrollOffsetRef.current = y;
          if (y >= 0) {
            // The finger has to bring the list back to rest before another
            // pull can trigger — one refresh per gesture, exactly like the
            // native control.
            pullArmedRef.current = false;
          } else if (!pullArmedRef.current && y <= -PULL_REFRESH_DISTANCE) {
            pullArmedRef.current = true;
            void onRefresh();
          }
        }}
        scrollEventThrottle={16}
      >
        <View style={styles.intro}>
          <AppText variant="eyebrow" tone="accent">
            Your club journey
          </AppText>
          <View style={styles.introTitleRow}>
            <PassportIcon size={27} color={colors.accent} strokeWidth={1.7} />
            <AppText variant="display" style={styles.flex}>
              Your Passport
            </AppText>
            <Pressable
              style={({ pressed }) => [
                styles.infoButton,
                pressed && styles.pressed,
              ]}
              onPress={() => router.push(routes.passportInfo())}
              accessibilityRole="button"
              accessibilityLabel="How Passport ranks work"
              accessibilityHint="Explains Passport points and the avatar rings each rank unlocks"
            >
              <Ionicons
                name="information-circle-outline"
                size={24}
                color={colors.accent}
              />
            </Pressable>
          </View>
          <AppText tone="secondary" style={styles.introBody}>
            Complete milestones to earn Passport points and unlock new rank
            rings.
          </AppText>
          <View style={styles.rankSummary}>
            <View style={styles.rankMetric}>
              <AppText variant="eyebrow" style={styles.rankLabel}>
                Current rank
              </AppText>
              <AppText variant="title" style={styles.rankValue}>
                {rank.tier?.name ?? "Well"}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {rank.next ? `Next Rank: ${rank.next.name}` : "Highest rank"}
              </AppText>
            </View>
            <View style={styles.rankMetric}>
              <AppText variant="eyebrow" style={styles.rankLabel}>
                Passport points
              </AppText>
              <AppText variant="title" style={styles.rankValue}>
                {passportPoints}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {rank.next
                  ? `${rank.remaining} points to ${rank.next.name}`
                  : "Top rank unlocked"}
              </AppText>
            </View>
          </View>
          {error ? <AppText tone="danger">{error}</AppText> : null}
        </View>
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
              <AppText variant="heading">{section.title}</AppText>
            </View>
            <View style={styles.card}>
              {section.groups.map(([title, stamps], index) => {
                const containsLinkedStamp = stamps.some(
                  (stamp) => stamp.key === stampKey
                );
                const expanded = open[title] ?? containsLinkedStamp;
                const isMartiniStyle =
                  stamps[0]?.metric === "type_reviews" ||
                  stamps[0]?.metric === "spirit_reviews";
                const styleName = styleNameFromTitle(title);
                const displayTitle = isMartiniStyle ? styleName : title;
                const hint = isMartiniStyle
                  ? (MARTINI_STYLE_HINTS[styleName] ??
                    `Explore more ${styleName} martinis.`)
                  : stamps[0]?.hint;
                const pointsEarned = stamps
                  .filter((stamp) => stamp.earned)
                  .reduce((total, stamp) => total + stamp.points, 0);
                // Groups of one-shot stamps (every threshold is 1 — the
                // combos, the First Steps profile stamps) count completions;
                // milestone ladders show the best progress along the ladder.
                const currentCount = stamps.every(
                  (stamp) => stamp.threshold === 1
                )
                  ? stamps.filter((stamp) => stamp.progress >= stamp.threshold)
                      .length
                  : Math.max(0, ...stamps.map((stamp) => stamp.progress));
                return (
                  <View
                    key={title}
                    ref={containsLinkedStamp ? linkedGroupRef : undefined}
                    onLayout={
                      containsLinkedStamp
                        ? scrollToLinkedAchievement
                        : undefined
                    }
                    style={[styles.group, index > 0 && styles.divider]}
                  >
                    <Pressable
                      onPress={() =>
                        setOpen((value) => ({ ...value, [title]: !expanded }))
                      }
                      accessibilityRole="button"
                      accessibilityState={{ expanded }}
                    >
                      <View style={styles.groupHeader}>
                        <AppText variant="bodyStrong" style={styles.flex}>
                          {displayTitle} · {currentCount}
                        </AppText>
                        <AppText variant="label" style={styles.groupProgress}>
                          {pointsEarned} pts
                        </AppText>
                        <Ionicons
                          name={expanded ? "chevron-up" : "chevron-down"}
                          size={18}
                          color={colors.textMuted}
                        />
                      </View>
                      <AppText variant="caption" tone="secondary">
                        {hint}
                      </AppText>
                    </Pressable>
                    {expanded ? (
                      <View style={styles.grid}>
                        {stamps.map((stamp) => (
                          <View key={stamp.id} style={styles.cell}>
                            <PassportStamp
                              shape={stamp.metric}
                              milestone={stamp.threshold}
                              pointAward={stamp.points}
                              earned={stamp.earned}
                              label={stamp.label.replace(/^\d+\s+/, "")}
                              accessibilityLabel={`${stamp.title}, ${stamp.earned ? "earned" : "locked"}, ${stamp.points} points`}
                            />
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
      {/* Pull-to-refresh feedback: the pull is detected from scroll offsets
          and answered with this floating chip, since the native control's
          spinner never draws under the native tab bar. */}
      {refreshing ? (
        <View style={styles.refreshChip} pointerEvents="none">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.background },
  content: {
    paddingHorizontal: t.spacing.gutter,
    paddingTop: t.spacing.sm,
    gap: t.spacing.lg,
  },
  intro: { gap: t.spacing.sm },
  introTitleRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  infoButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "flex-start" as const,
    borderRadius: t.radius.pill,
  },
  pressed: { opacity: 0.7 },
  introBody: { maxWidth: 560 },
  rankSummary: {
    flexDirection: "row" as const,
    gap: t.spacing.sm,
    paddingTop: t.spacing.xs,
  },
  rankMetric: {
    flex: 1,
    minWidth: 0,
    minHeight: 76,
    justifyContent: "flex-start" as const,
    gap: 2,
    padding: t.spacing.lg,
    borderRadius: t.radius.thumb,
    borderCurve: "continuous" as const,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  rankValue: {
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  rankLabel: {
    color: t.colors.textMuted,
  },
  section: { gap: t.spacing.sm },
  sectionHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
  },
  card: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    overflow: "hidden" as const,
  },
  group: { padding: t.spacing.lg },
  divider: { borderTopWidth: 1, borderTopColor: t.colors.border },
  groupHeader: {
    minHeight: 32,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  flex: { flex: 1, minWidth: 0 },
  groupProgress: { fontVariant: ["tabular-nums"] as const },
  grid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    marginTop: t.spacing.md,
    marginHorizontal: -t.spacing.lg,
    marginBottom: -t.spacing.lg,
    paddingHorizontal: t.spacing.lg - t.spacing.xs / 2,
    paddingVertical: t.spacing.md,
    backgroundColor: t.colors.surfaceRaised,
  },
  cell: { width: "33.3333%" as const, padding: t.spacing.xs / 2 },
  // A small floating plate, Instagram-style: the screen answers a pull with a
  // spinner over the content instead of the (broken) native inset spinner.
  refreshChip: {
    position: "absolute" as const,
    top: 12,
    alignSelf: "center" as const,
    zIndex: 20,
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surface,
    borderWidth: 1,
    borderColor: t.colors.border,
    ...t.elevation.card,
  },
}));
