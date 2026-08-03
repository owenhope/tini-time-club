import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { makeStyles } from "@/theme";

export const RATING_MAX = 5;

export type RatingSummaryTone = "surface" | "onImage";

export interface RatingSummaryProps {
  overall?: number | null;
  taste?: number | null;
  presentation?: number | null;
  reviewCount?: number | null;
  /** "onImage" renders light-on-ink, for the green aggregate block. */
  tone?: RatingSummaryTone;
  /** Hide the review count (e.g. where it would be meaningless). */
  showReviewCount?: boolean;
  /** Start the fill animation only when the surrounding content is visible. */
  animateBars?: boolean;
}

const format = (value?: number | null) =>
  value === null || value === undefined ? null : value.toFixed(1);

/**
 * A place's aggregate: the blended score, then taste and presentation as
 * meters, each on a full-width row of its own.
 *
 * The three-column arrangement this replaced gave the meters ~89pt on the bar
 * page and ~62pt in the map sheet, so "Presentation" truncated to "Pre…" — the
 * label lost before the number did. Nothing has to shrink here, and the same
 * block fits any sheet height.
 *
 * Value is never encoded by colour alone: the numeral is always present.
 */
const RatingSummary: React.FC<RatingSummaryProps> = ({
  overall,
  taste,
  presentation,
  reviewCount,
  tone = "surface",
  showReviewCount = true,
  animateBars = true,
}) => {
  const styles = useStyles();
  const onImage = tone === "onImage";
  const hasBreakdown = taste != null || presentation != null;

  const countLabel = useMemo(() => {
    if (!showReviewCount || reviewCount == null) return null;
    return reviewCount === 1 ? "1 review" : `${reviewCount} reviews`;
  }, [reviewCount, showReviewCount]);

  // One composed sentence, so a screen reader reads the block as a unit
  // instead of announcing eight disconnected numbers and words.
  const a11yLabel = useMemo(() => {
    if (overall == null && !hasBreakdown) {
      return countLabel ? `Not yet rated. ${countLabel}.` : "Not yet rated.";
    }
    const parts: string[] = [];
    if (overall != null)
      parts.push(`Overall ${format(overall)} out of ${RATING_MAX}`);
    if (taste != null)
      parts.push(`Taste ${format(taste)} out of ${RATING_MAX}`);
    if (presentation != null)
      parts.push(`Presentation ${format(presentation)} out of ${RATING_MAX}`);
    if (countLabel) parts.push(countLabel);
    return `${parts.join(". ")}.`;
  }, [overall, taste, presentation, hasBreakdown, countLabel]);

  return (
    <View
      style={styles.block}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      {overall != null ? (
        <View style={styles.top}>
          <Text style={[styles.score, onImage && styles.scoreOnInk]}>
            {format(overall)}
          </Text>
          <View style={styles.meta}>
            <Text style={[styles.eyebrow, onImage && styles.eyebrowOnInk]}>
              Overall
            </Text>
            {countLabel ? (
              <Text style={[styles.count, onImage && styles.countOnInk]}>
                {countLabel}
              </Text>
            ) : null}
          </View>
        </View>
      ) : (
        <Text style={[styles.empty, onImage && styles.eyebrowOnInk]}>
          Not yet rated
        </Text>
      )}

      {hasBreakdown ? (
        <View style={styles.bars}>
          <RatingBar
            label="Taste"
            value={taste}
            onImage={onImage}
            active={animateBars}
          />
          <RatingBar
            label="Presentation"
            value={presentation}
            onImage={onImage}
            active={animateBars}
          />
        </View>
      ) : null}
    </View>
  );
};

const RatingBar = ({
  label,
  value,
  onImage,
  active,
}: {
  label: string;
  value?: number | null;
  onImage: boolean;
  active: boolean;
}) => {
  const styles = useStyles();
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value / RATING_MAX));

  // The fill grows from empty to the score when the bar appears (and glides
  // to the new value if the score changes in place).
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    fill.stopAnimation();

    if (!active) {
      fill.setValue(0);
      return;
    }

    const animation = Animated.timing(fill, {
      toValue: pct,
      duration: 650,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // drives width
    });
    animation.start();

    return () => animation.stop();
  }, [active, pct, fill]);

  return (
    <View
      style={styles.bar}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.barHeader}>
        {/* Full width, so the label sets at the system's eyebrow size and
            never has to truncate. */}
        <Text style={[styles.eyebrow, onImage && styles.eyebrowOnInk]}>
          {label}
        </Text>
        <Text style={[styles.barValue, onImage && styles.barValueOnInk]}>
          {format(value) ?? "—"}
        </Text>
      </View>
      <View style={[styles.track, onImage && styles.trackOnInk]}>
        <Animated.View
          style={[
            styles.fill,
            onImage && styles.fillOnInk,
            {
              width: fill.interpolate({
                inputRange: [0, 1],
                outputRange: ["0%", "100%"],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  block: {
    gap: t.spacing.lg,
  },
  top: {
    flexDirection: "row" as const,
    alignItems: "flex-end" as const,
    gap: t.spacing.lg - 2,
  },
  // The aggregate is the loudest thing on the block, so it gets the display
  // cut rather than the metric one. Leading below the point size would clip
  // the numerals in RN, so the tightness comes from negative margin.
  score: {
    ...t.typography.displayLarge,
    fontSize: 46,
    lineHeight: 48,
    marginBottom: -6,
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  scoreOnInk: {
    color: t.colors.ratingFillOnInk,
  },
  meta: {
    flex: 1,
    minWidth: 0,
    gap: 3,
    paddingBottom: 3,
  },
  eyebrow: {
    ...t.typography.eyebrow,
    color: t.colors.textMuted,
  },
  // Sage rather than paper: the eyebrow is supporting type, and green-300
  // clears 7:1 on the green ground without competing with the value.
  eyebrowOnInk: {
    color: t.colors.accentOnImage,
  },
  // Counts and scores are data, so they set in mono per the system.
  count: {
    ...t.typography.mono,
    color: t.colors.textSecondary,
  },
  countOnInk: {
    color: t.colors.onInk,
  },
  empty: {
    ...t.typography.body,
    color: t.colors.textMuted,
  },
  bars: {
    gap: t.spacing.md - 2,
  },
  bar: {
    gap: 5,
  },
  barHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.sm,
  },
  barValue: {
    ...t.typography.mono,
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  barValueOnInk: {
    color: t.colors.onInk,
  },
  track: {
    height: 7,
    width: "100%" as const,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.ratingTrack,
    overflow: "hidden" as const,
  },
  trackOnInk: {
    backgroundColor: t.colors.ratingTrackOnInk,
  },
  fill: {
    height: "100%" as const,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.ratingFill,
  },
  // One rule for the meter: the rating accent for whichever ground it is on.
  // White here read as neutral chrome and left the accent showing on only one
  // of the two screens that draw the same two numbers.
  fillOnInk: {
    backgroundColor: t.colors.ratingFillOnInk,
  },
}));

export default RatingSummary;
