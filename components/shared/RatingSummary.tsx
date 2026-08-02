import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { fonts, makeStyles, useTheme } from "@/theme";
import RatingPips from "./RatingPips";

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
  /** Start bar animation only when the surrounding content is visible. */
  animateBars?: boolean;
  /** Show the large overall score row in the full variant. */
  showOverall?: boolean;
  /** Show the visible "out of 5 / Overall" text beside the score. */
  showOverallMeta?: boolean;
  /** Show an "Overall" heading above the score without the scale metadata. */
  showOverallHeading?: boolean;
  /** Show the Taste and Presentation bars in the full variant. */
  showBreakdown?: boolean;
  /** Place the review count at the row edge or beneath the overall label. */
  countPlacement?: "inline" | "meta" | "score";
  /** Place each rating bar beside or beneath its label. */
  breakdownLayout?: "inline" | "stacked";
  /** Controls the visual size of the overall score in the full variant. */
  overallSize?: "large" | "title" | "small";
  /** Place the overall score before the breakdown or at its right edge. */
  overallPlacement?: "start" | "right";
  /** Include the star icon and dot separators in the compact variant. */
  compactDecorated?: boolean;
  /** Arrange compact values in a row or a vertical stack. */
  compactLayout?: "row" | "stacked";
  /** Match the compact score to title-sized text when it leads a card. */
  compactOverallSize?: "default" | "title";
  /** Match compact supporting text to a card subtitle. */
  compactMetaSize?: "default" | "subtitle";
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
  animateBars = true,
  showOverall = true,
  showOverallMeta = true,
  showOverallHeading = false,
  showBreakdown = true,
  countPlacement = "inline",
  breakdownLayout = "inline",
  overallSize = "large",
  overallPlacement = "start",
  compactDecorated = true,
  compactLayout = "row",
  compactOverallSize = "default",
  compactMetaSize = "default",
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const onImage = tone === "onImage";

  const hasAnyRating =
    (showOverall && overall != null) ||
    (showBreakdown && (taste != null || presentation != null));

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
    if (showOverall && overall != null)
      parts.push(`Overall ${format(overall)} out of ${RATING_MAX}`);
    if (showBreakdown && taste != null)
      parts.push(`Taste ${format(taste)} out of ${RATING_MAX}`);
    if (showBreakdown && presentation != null)
      parts.push(`Presentation ${format(presentation)} out of ${RATING_MAX}`);
    if (countLabel) parts.push(countLabel);
    return `${parts.join(". ")}.`;
  }, [
    hasAnyRating,
    overall,
    taste,
    presentation,
    countLabel,
    showOverall,
    showBreakdown,
  ]);

  if (variant === "compact") {
    return (
      <View
        style={[
          styles.compactRow,
          compactLayout === "stacked" && styles.compactStack,
        ]}
        accessible
        accessibilityRole="summary"
        accessibilityLabel={a11yLabel}
      >
        {hasAnyRating ? (
          <>
            {overall != null && (
              <>
                {compactDecorated ? (
                  <RatingPips
                    value={1}
                    max={1}
                    size={13}
                    onDark={onImage}
                    accessibilityLabel=""
                  />
                ) : null}
                <Text
                  style={[
                    styles.compactOverall,
                    compactOverallSize === "title" &&
                      styles.compactOverallTitle,
                    onImage && styles.onImage,
                  ]}
                >
                  {format(overall)}
                </Text>
              </>
            )}
            {taste != null && (
              <Text
                style={[
                  styles.compactMeta,
                  compactMetaSize === "subtitle" && styles.compactMetaSubtitle,
                  onImage && styles.onImageMeta,
                ]}
              >
                {compactDecorated ? "· " : ""}Taste {format(taste)}
              </Text>
            )}
            {presentation != null && (
              <Text
                style={[
                  styles.compactMeta,
                  compactMetaSize === "subtitle" && styles.compactMetaSubtitle,
                  onImage && styles.onImageMeta,
                ]}
              >
                {compactDecorated ? "· " : ""}Presentation{" "}
                {format(presentation)}
              </Text>
            )}
          </>
        ) : (
          <Text style={[styles.compactMeta, onImage && styles.onImageMeta]}>
            Not yet rated
          </Text>
        )}
        {countLabel && (
          <Text
            style={[
              styles.compactMeta,
              compactMetaSize === "subtitle" && styles.compactMetaSubtitle,
              onImage && styles.onImageMeta,
            ]}
          >
            {compactDecorated ? "· " : ""}
            {countLabel}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        overallPlacement === "right" && styles.containerOverallRight,
      ]}
      accessible
      accessibilityRole="summary"
      accessibilityLabel={a11yLabel}
    >
      {hasAnyRating ? (
        // React Native has no flexbox `order`, so the placement is expressed
        // in render order: bars first puts the overall score on the right.
        (() => {
          // A single review has no aggregate, so the hero is skipped rather
          // than rendered as a placeholder dash.
          const overallBlock = showOverall && overall != null && (
            <View
              key="overall"
              style={[
                styles.overallRow,
                overallPlacement === "right" && styles.overallRowRight,
              ]}
            >
              <View style={styles.scoreColumn}>
                {showOverallHeading ? (
                  <Text
                    style={[
                      styles.overallHeading,
                      onImage && styles.onImageMeta,
                    ]}
                  >
                    Overall
                  </Text>
                ) : null}
                <Text
                  style={[
                    styles.overallValue,
                    overallSize === "title" && styles.overallValueTitle,
                    overallSize === "small" && styles.overallValueSmall,
                    onImage && styles.onImage,
                  ]}
                >
                  {format(overall)}
                </Text>
                {countLabel && countPlacement === "score" ? (
                  <Text
                    style={[
                      styles.ratingDetailText,
                      onImage && styles.onImageMeta,
                    ]}
                  >
                    {countLabel}
                  </Text>
                ) : null}
              </View>
              {showOverallMeta ? (
                <View
                  style={[
                    styles.overallMeta,
                    countPlacement === "score" && styles.overallMetaTop,
                  ]}
                >
                  <Text
                    style={[styles.overallScale, onImage && styles.onImageMeta]}
                  >
                    out of {RATING_MAX}
                  </Text>
                  <Text
                    style={[styles.overallLabel, onImage && styles.onImage]}
                  >
                    Overall
                  </Text>
                  {countLabel && countPlacement === "meta" ? (
                    <Text
                      style={[styles.countMeta, onImage && styles.onImageMeta]}
                    >
                      {countLabel}
                    </Text>
                  ) : null}
                </View>
              ) : null}
              {countLabel && countPlacement === "inline" && (
                <Text
                  style={[styles.countInline, onImage && styles.onImageMeta]}
                >
                  {countLabel}
                </Text>
              )}
            </View>
          );

          const barsBlock = showBreakdown && (
            <View
              key="bars"
              style={[
                styles.bars,
                overallPlacement === "right" && styles.barsOverallRight,
              ]}
            >
              <RatingBar
                label="Taste"
                value={taste}
                onImage={onImage}
                active={animateBars}
                layout={breakdownLayout}
              />
              <RatingBar
                label="Presentation"
                value={presentation}
                onImage={onImage}
                active={animateBars}
                layout={breakdownLayout}
              />
            </View>
          );

          return overallPlacement === "right" ? (
            <>
              {barsBlock}
              {overallBlock}
            </>
          ) : (
            <>
              {overallBlock}
              {barsBlock}
            </>
          );
        })()
      ) : (
        <Text style={[styles.emptyText, onImage && styles.onImageMeta]}>
          Not yet rated
        </Text>
      )}

      {countLabel && (!showOverall || overall == null) && (
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
  active,
  layout,
}: {
  label: string;
  value?: number | null;
  onImage: boolean;
  active: boolean;
  layout: "inline" | "stacked";
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

  const barTrack = (
    <View
      style={[
        styles.barTrack,
        layout === "inline" && styles.inlineBarTrack,
        layout === "stacked" && styles.stackedBarTrack,
        onImage && styles.barTrackOnImage,
      ]}
    >
      <Animated.View
        style={[
          styles.barFill,
          onImage && styles.barFillOnImage,
          {
            width: fill.interpolate({
              inputRange: [0, 1],
              outputRange: ["0%", "100%"],
            }),
          },
        ]}
      />
    </View>
  );

  if (layout === "stacked") {
    return (
      <View
        style={styles.stackedBar}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <View style={styles.stackedBarHeader}>
          <Text
            style={[styles.ratingDetailText, onImage && styles.onImageMeta]}
          >
            {label}
          </Text>
          <Text style={[styles.stackedBarValue, onImage && styles.onImage]}>
            {format(value) ?? "—"}
          </Text>
        </View>
        {barTrack}
      </View>
    );
  }

  return (
    // The parent block already carries a composed label; hide the pieces so
    // the values aren't announced twice.
    <View
      style={styles.barRow}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Text
        style={[
          styles.ratingDetailText,
          styles.barLabel,
          onImage && styles.onImageMeta,
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
      {barTrack}
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
  containerOverallRight: {
    flexDirection: "row" as const,
    // Bottom-aligned so the large numeral finishes level with the last bar
    // rather than floating above it.
    alignItems: "flex-end" as const,
    // Much wider than the stacked layout's gap: the large overall numeral
    // needs clear separation from the taste/presentation bars beside it.
    gap: t.spacing.xl * 3,
  },
  overallRow: {
    width: "100%" as const,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
  },
  overallRowRight: {
    width: "auto" as const,
    flexShrink: 0,
  },
  overallValue: {
    ...t.typography.metricLarge,
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  overallValueTitle: {
    ...t.typography.title,
    fontSize: 24,
  },
  overallValueSmall: {
    ...t.typography.title,
    fontSize: 17,
    lineHeight: 22,
  },
  overallHeading: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
  scoreColumn: {
    alignItems: "flex-start" as const,
    // Matches the 6pt label-to-content gap of the dense Regulars column, so
    // the two columns share one vertical rhythm when shown side by side.
    gap: 6,
  },
  overallMeta: {
    justifyContent: "center" as const,
  },
  overallMetaTop: {
    alignSelf: "flex-start" as const,
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
  barsOverallRight: {
    flex: 1,
    minWidth: 0,
  },
  barRow: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
  },
  stackedBar: {
    gap: t.spacing.xs,
  },
  stackedBarHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.sm,
  },
  ratingDetailText: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    lineHeight: 18,
  },
  barLabel: {
    width: 96,
  },
  barTrack: {
    height: 8,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.ratingTrack,
    overflow: "hidden" as const,
  },
  inlineBarTrack: {
    flex: 1,
  },
  stackedBarTrack: {
    width: "100%" as const,
    alignSelf: "stretch" as const,
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
    fontFamily: fonts.bold,
    color: t.colors.text,
    width: 32,
    textAlign: "right" as const,
    fontVariant: ["tabular-nums"] as const,
  },
  stackedBarValue: {
    ...t.typography.caption,
    fontFamily: fonts.bold,
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  countText: {
    ...t.typography.caption,
    color: t.colors.textMuted,
  },
  countInline: {
    ...t.typography.bodyStrong,
    color: t.colors.textSecondary,
    marginLeft: "auto" as const,
  },
  countMeta: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
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
  compactStack: {
    flexDirection: "column" as const,
    alignItems: "flex-end" as const,
    gap: 2,
  },
  compactOverall: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    fontVariant: ["tabular-nums"] as const,
  },
  compactOverallTitle: { ...t.typography.bodyStrong },
  compactMeta: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  compactMetaSubtitle: { ...t.typography.caption },
  onImage: {
    color: t.colors.textOnImage,
  },
  onImageMeta: {
    fontSize: 13,
    color: "rgba(255,255,255,0.85)",
  },
}));

export default RatingSummary;
