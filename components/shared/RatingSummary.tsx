import React, { useMemo } from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";

export const RATING_MAX = 5;

export type RatingSummaryVariant = "full" | "compact";
export type RatingSummaryTone = "surface" | "onImage";

export interface RatingSummaryProps {
  overall?: number | null;
  taste?: number | null;
  presentation?: number | null;
  reviewCount?: number | null;
  variant?: RatingSummaryVariant;
  /** "onImage" renders light-on-scrim, for use over a review photo. */
  tone?: RatingSummaryTone;
  /** Hide the review count (e.g. on a single review, where it's meaningless). */
  showReviewCount?: boolean;
}

const format = (value?: number | null) =>
  value === null || value === undefined ? null : value.toFixed(1);

/**
 * Aggregate rating display.
 *
 * Replaces the previous four-solid-circles layout, which had three problems:
 * the review *count* was rendered identically to the three *scores* despite
 * being a different unit; colour carried no meaning (taste and presentation
 * were the same colour); and the /5 scale was never stated.
 *
 * Here the overall score leads as a numeral with an explicit scale, taste and
 * presentation become bars so two values can be compared at a glance, and the
 * review count is demoted to plain secondary text. Value is never encoded by
 * colour alone — the numeral is always present.
 */
const RatingSummary: React.FC<RatingSummaryProps> = ({
  overall,
  taste,
  presentation,
  reviewCount,
  variant = "full",
  tone = "surface",
  showReviewCount = true,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const onImage = tone === "onImage";

  const hasAnyRating = overall != null || taste != null || presentation != null;

  const countLabel = useMemo(() => {
    if (!showReviewCount || reviewCount == null) return null;
    return reviewCount === 1 ? "1 review" : `${reviewCount} reviews`;
  }, [reviewCount, showReviewCount]);

  // One composed sentence, so a screen reader reads the block as a unit
  // instead of announcing eight disconnected numbers and words.
  const a11yLabel = useMemo(() => {
    if (!hasAnyRating) {
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
  }, [hasAnyRating, overall, taste, presentation, countLabel]);

  if (variant === "compact") {
    return (
      <View
        style={styles.compactRow}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={a11yLabel}
      >
        {hasAnyRating ? (
          <>
            {overall != null && (
              <>
                <Ionicons
                  name="star"
                  size={14}
                  color={onImage ? colors.textOnImage : colors.accent}
                />
                <Text
                  style={[styles.compactOverall, onImage && styles.onImage]}
                >
                  {format(overall)}
                </Text>
              </>
            )}
            {taste != null && (
              <Text style={[styles.compactMeta, onImage && styles.onImageMeta]}>
                · Taste {format(taste)}
              </Text>
            )}
            {presentation != null && (
              <Text style={[styles.compactMeta, onImage && styles.onImageMeta]}>
                · Presentation {format(presentation)}
              </Text>
            )}
          </>
        ) : (
          <Text style={[styles.compactMeta, onImage && styles.onImageMeta]}>
            Not yet rated
          </Text>
        )}
        {countLabel && (
          <Text style={[styles.compactMeta, onImage && styles.onImageMeta]}>
            · {countLabel}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View
      style={styles.container}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      {hasAnyRating ? (
        <>
          {/* A single review has no aggregate, so the hero is skipped rather
              than rendered as a placeholder dash. */}
          {overall != null && (
            <View style={styles.overallRow}>
              <Text style={[styles.overallValue, onImage && styles.onImage]}>
                {format(overall)}
              </Text>
              <View style={styles.overallMeta}>
                <Text
                  style={[styles.overallScale, onImage && styles.onImageMeta]}
                >
                  out of {RATING_MAX}
                </Text>
                <Text style={[styles.overallLabel, onImage && styles.onImage]}>
                  Overall
                </Text>
              </View>
            </View>
          )}

          <View style={styles.bars}>
            <RatingBar label="Taste" value={taste} onImage={onImage} />
            <RatingBar
              label="Presentation"
              value={presentation}
              onImage={onImage}
            />
          </View>
        </>
      ) : (
        <Text style={[styles.emptyText, onImage && styles.onImageMeta]}>
          Not yet rated
        </Text>
      )}

      {countLabel && (
        <Text style={[styles.countText, onImage && styles.onImageMeta]}>
          {countLabel}
        </Text>
      )}
    </View>
  );
};

const RatingBar = ({
  label,
  value,
  onImage,
}: {
  label: string;
  value?: number | null;
  onImage: boolean;
}) => {
  const styles = useStyles();
  const pct = value == null ? 0 : Math.max(0, Math.min(1, value / RATING_MAX));

  return (
    // The parent block already carries a composed label; hide the pieces so
    // the values aren't announced twice.
    <View
      style={styles.barRow}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        style={[styles.barLabel, onImage && styles.onImageMeta]}
        numberOfLines={1}
      >
        {label}
      </Text>
      <View style={[styles.barTrack, onImage && styles.barTrackOnImage]}>
        <View
          style={[
            styles.barFill,
            onImage && styles.barFillOnImage,
            { width: `${pct * 100}%` },
          ]}
        />
      </View>
      <Text style={[styles.barValue, onImage && styles.onImage]}>
        {format(value) ?? "—"}
      </Text>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    gap: t.spacing.md,
  },
  overallRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
  },
  overallValue: {
    ...t.typography.metricLarge,
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  overallMeta: {
    justifyContent: "center" as const,
  },
  overallScale: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  overallLabel: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  bars: {
    gap: t.spacing.sm,
  },
  barRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
  },
  barLabel: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    width: 96,
  },
  barTrack: {
    flex: 1,
    height: 8,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.ratingTrack,
    overflow: "hidden" as const,
  },
  barTrackOnImage: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  barFill: {
    height: "100%" as const,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.ratingFill,
  },
  barFillOnImage: {
    backgroundColor: t.colors.textOnImage,
  },
  barValue: {
    ...t.typography.caption,
    fontWeight: "700" as const,
    color: t.colors.text,
    width: 32,
    textAlign: "right" as const,
    fontVariant: ["tabular-nums"] as const,
  },
  countText: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  emptyText: {
    ...t.typography.body,
    color: t.colors.textMuted,
  },
  compactRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flexWrap: "wrap" as const,
    gap: t.spacing.xs,
  },
  compactOverall: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  compactMeta: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  onImage: {
    color: t.colors.textOnImage,
  },
  onImageMeta: {
    color: "rgba(255,255,255,0.85)",
  },
}));

export default RatingSummary;
