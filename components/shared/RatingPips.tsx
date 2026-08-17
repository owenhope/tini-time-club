import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/theme";
import { RATING_MIN, RATING_STEP } from "@/utils/ratingUtils";
import AppText from "./AppText";
import OliveIcon, { getOliveIconCanvasSize } from "./OliveIcon";

export const PIPS_MAX = 5;
const INTERACTIVE_GAP = 4;

export interface RatingPipsProps {
  /** 0–max. Read-only ratings clip the fractional olive to its exact fill. */
  value?: number;
  max?: number;
  /** Height of one olive in px. Width is derived. */
  size?: number;
  /** Show the selected numeric value above the pips. */
  showValue?: boolean;
  /** Override the selected value ink to match its surrounding copy. */
  valueColor?: string;
  /** Makes the pips tappable and draggable — the composer's rating control. */
  onRate?: (value: number) => void;
  /** Pips sit on a photo scrim or a green ground. */
  onDark?: boolean;
  /** Explicit olive-body colour, for grounds neither default nor onDark
   *  covers — the purple verdict block, where green fails contrast. */
  bodyColor?: string;
  /** Outline colour for hollow pips, for the same reason. */
  emptyColor?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * The brand's own rating scale: the olive from the wordmark's full stop.
 * The design system is explicit that stars are off-brand — this replaces them
 * everywhere. An olive body with the pimento sitting off-centre, hollow when
 * the rating hasn't reached it.
 */
const Olive: React.FC<{
  size: number;
  fillAmount: number;
  bodyColor?: string;
  emptyColor?: string;
  faintWhenEmpty?: boolean;
}> = ({ size, fillAmount, bodyColor, emptyColor, faintWhenEmpty }) => {
  const { colors } = useTheme();
  const canvas = getOliveIconCanvasSize(size);
  const resolvedEmptyColor = emptyColor ?? colors.ratingPipEmpty;

  if (fillAmount > 0) {
    return (
      <View
        style={{
          width: canvas.width,
          height: canvas.height,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <OliveIcon size={size} color={bodyColor} opacity={fillAmount} />
      </View>
    );
  }

  return (
    <View
      style={{
        width: canvas.width,
        height: canvas.height,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <OliveIcon
        size={size}
        color={bodyColor}
        opacity={faintWhenEmpty ? 0.3 : 1}
        outlineColor={faintWhenEmpty ? undefined : resolvedEmptyColor}
      />
    </View>
  );
};

const RatingPips: React.FC<RatingPipsProps> = ({
  value = 0,
  max = PIPS_MAX,
  size = 16,
  showValue,
  valueColor,
  onRate,
  onDark,
  bodyColor,
  emptyColor,
  style,
  accessibilityLabel,
}) => {
  const interactiveRowRef = React.useRef<View>(null);
  const interactiveRowPageX = React.useRef<number | null>(null);
  const lastInteractionValue = React.useRef<number | null>(null);
  const minimumValue = onRate ? Math.min(RATING_MIN, max) : 0;
  const clampedValue = Math.max(minimumValue, Math.min(value, max));
  const visiblePipCount = onRate ? max : Math.ceil(clampedValue);
  const pips = Array.from({ length: visiblePipCount }, (_, i) => i + 1);

  const fillAmountFor = (pip: number) =>
    Number(Math.max(0, Math.min(1, clampedValue - (pip - 1))).toFixed(2));

  const rateFromPosition = (locationX: number) => {
    const pipWidth = getOliveIconCanvasSize(size).width;
    const stride = pipWidth + INTERACTIVE_GAP;
    const totalWidth = max * pipWidth + (max - 1) * INTERACTIVE_GAP;
    const x = Math.max(0, Math.min(locationX, totalWidth - Number.EPSILON));
    const pipIndex = Math.min(max - 1, Math.floor(x / stride));
    const localX = x - pipIndex * stride;

    const rating =
      localX > pipWidth
        ? pipIndex + (localX - pipWidth <= INTERACTIVE_GAP / 2 ? 1 : 1.5)
        : pipIndex + (localX < pipWidth / 2 ? 0.5 : 1);

    return Math.max(RATING_MIN, rating);
  };

  const adjustRating = (direction: "increment" | "decrement") => {
    const next =
      direction === "increment"
        ? Math.max(RATING_MIN, clampedValue + RATING_STEP)
        : Math.max(RATING_MIN, clampedValue - RATING_STEP);
    onRate?.(Math.min(max, next));
  };

  const reportRating = (next: number) => {
    if (next === lastInteractionValue.current) return;

    lastInteractionValue.current = next;
    void Haptics.selectionAsync();
    onRate?.(next);
  };

  const finishInteraction = () => {
    lastInteractionValue.current = null;
  };

  const measureInteractiveRow = () => {
    interactiveRowRef.current?.measureInWindow((x) => {
      interactiveRowPageX.current = x;
    });
  };

  const handleDrag = (nativeEvent: { locationX: number; pageX?: number }) => {
    const locationX =
      Number.isFinite(nativeEvent.pageX) && interactiveRowPageX.current != null
        ? (nativeEvent.pageX as number) - interactiveRowPageX.current
        : nativeEvent.locationX;
    reportRating(rateFromPosition(locationX));
  };

  const pipRow = pips.map((n) => (
    <Olive
      key={n}
      size={size}
      fillAmount={fillAmountFor(n)}
      bodyColor={bodyColor}
      emptyColor={emptyColor}
      faintWhenEmpty={Boolean(onRate)}
    />
  ));

  const interactivePipRow = pips.map((n) => (
    <Pressable
      key={n}
      testID={`rating-pip-touch-${n}`}
      accessible={false}
      onPressIn={() => {
        finishInteraction();
        measureInteractiveRow();
        reportRating(n);
      }}
      onTouchMove={({ nativeEvent }) => handleDrag(nativeEvent)}
      onPressOut={finishInteraction}
    >
      <Olive
        size={size}
        fillAmount={fillAmountFor(n)}
        bodyColor={bodyColor}
        emptyColor={emptyColor}
        faintWhenEmpty
      />
    </Pressable>
  ));

  const rowStyle = [
    {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: onRate ? INTERACTIVE_GAP : size * 0.28,
    },
    style,
  ];

  return (
    <View style={{ alignItems: "center", gap: 8 }}>
      {showValue ? (
        <AppText
          variant="display"
          tone={onDark ? "onImage" : "muted"}
          style={valueColor ? { color: valueColor } : undefined}
        >
          {clampedValue.toFixed(1)}
        </AppText>
      ) : null}
      {onRate ? (
        <View
          ref={interactiveRowRef}
          style={rowStyle}
          onLayout={measureInteractiveRow}
          onTouchMove={({ nativeEvent }) => handleDrag(nativeEvent)}
          onTouchEnd={finishInteraction}
          onTouchCancel={finishInteraction}
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel ?? "Rating"}
          accessibilityValue={{
            min: minimumValue,
            max,
            now: clampedValue,
            text: `${clampedValue.toFixed(1)} out of ${max}`,
          }}
          accessibilityActions={[
            { name: "increment", label: `Increase by ${RATING_STEP}` },
            { name: "decrement", label: `Decrease by ${RATING_STEP}` },
          ]}
          onAccessibilityAction={({ nativeEvent }) => {
            if (nativeEvent.actionName === "increment")
              adjustRating("increment");
            if (nativeEvent.actionName === "decrement")
              adjustRating("decrement");
          }}
        >
          {interactivePipRow}
        </View>
      ) : (
        <View
          style={rowStyle}
          accessible
          accessibilityRole="image"
          accessibilityLabel={
            accessibilityLabel ?? `${value} out of ${max} olives`
          }
        >
          {pipRow}
        </View>
      )}
    </View>
  );
};

export default RatingPips;
