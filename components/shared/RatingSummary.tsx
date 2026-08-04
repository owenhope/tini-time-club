import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { makeStyles, useTheme } from "@/theme";
import RatingPips from "./RatingPips";

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
  /** Kept for callers from the former bar design; olives do not animate. */
  animateBars?: boolean;
}

const format = (value?: number | null) =>
  value === null || value === undefined ? null : value.toFixed(1);

/**
 * A place's aggregate: the blended score, then taste and presentation as
 * olive rows. This intentionally matches review cards and the map peek sheet:
 * one rating language across every place surface.
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
        <View style={styles.axes}>
          {taste != null ? (
            <RatingAxis label="Taste" value={taste} onImage={onImage} />
          ) : null}
          {presentation != null ? (
            <RatingAxis
              label="Presentation"
              value={presentation}
              onImage={onImage}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
};

const RatingAxis = ({
  label,
  value,
  onImage,
}: {
  label: string;
  value: number;
  onImage: boolean;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View
      style={styles.axis}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <View style={styles.axisHeader}>
        <Text style={[styles.eyebrow, onImage && styles.eyebrowOnInk]}>
          {label}
        </Text>
        <Text style={[styles.axisValue, onImage && styles.axisValueOnInk]}>
          {format(value)}
        </Text>
      </View>
      <RatingPips
        value={value}
        size={16}
        onDark={onImage}
        bodyColor={onImage ? colors.ratingFillOnInk : undefined}
        emptyColor={onImage ? colors.ratingTrackOnInk : undefined}
        accessibilityLabel=""
      />
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
  axes: {
    gap: t.spacing.md - 2,
  },
  axis: {
    gap: 6,
  },
  axisHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.sm,
  },
  axisValue: {
    ...t.typography.mono,
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  axisValueOnInk: {
    color: t.colors.onInk,
  },
}));

export default RatingSummary;
