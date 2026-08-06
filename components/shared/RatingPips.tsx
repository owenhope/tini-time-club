import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { HIT_SLOP, useTheme } from "@/theme";
import AppText from "./AppText";
import OliveIcon from "./OliveIcon";

export const PIPS_MAX = 5;

export interface RatingPipsProps {
  /** 0–max. Read-only ratings use opacity for the fractional olive. */
  value?: number;
  max?: number;
  /** Height of one olive in px. Width is derived. */
  size?: number;
  /** Show the numeric value in mono beside the pips. */
  showValue?: boolean;
  /** Makes the pips tappable — the composer's rating control. */
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
  const filled = fillAmount > 0;
  const faintEmpty = !filled && faintWhenEmpty;

  return (
    <View
      style={{
        width: size * 0.84,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <OliveIcon
        size={size}
        color={bodyColor}
        opacity={filled ? fillAmount : faintEmpty ? 0.3 : 1}
        outlineColor={
          filled || faintEmpty ? undefined : (emptyColor ?? colors.ratingPipEmpty)
        }
      />
    </View>
  );
};

const RatingPips: React.FC<RatingPipsProps> = ({
  value = 0,
  max = PIPS_MAX,
  size = 16,
  showValue,
  onRate,
  onDark,
  bodyColor,
  emptyColor,
  style,
  accessibilityLabel,
}) => {
  const clampedValue = Math.max(0, Math.min(value, max));
  const visiblePipCount = onRate ? max : Math.ceil(clampedValue);
  const pips = Array.from({ length: visiblePipCount }, (_, i) => i + 1);

  const fillAmountFor = (pip: number) =>
    Number(Math.max(0, Math.min(1, clampedValue - (pip - 1))).toFixed(2));

  return (
    <View
      style={[
        {
          flexDirection: "row",
          alignItems: "center",
          gap: onRate ? 4 : size * 0.28,
        },
        style,
      ]}
      accessible={!onRate}
      accessibilityRole={onRate ? undefined : "image"}
      accessibilityLabel={accessibilityLabel ?? `${value} out of ${max} olives`}
    >
      {pips.map((n) =>
        onRate ? (
          <Pressable
            key={n}
            onPress={() => {
              void Haptics.selectionAsync();
              onRate(n);
            }}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} of ${max}`}
            accessibilityState={{ selected: n <= clampedValue }}
          >
            <Olive
              size={size}
              fillAmount={fillAmountFor(n)}
              bodyColor={bodyColor}
              emptyColor={emptyColor}
              faintWhenEmpty
            />
          </Pressable>
        ) : (
          <Olive
            key={n}
            size={size}
            fillAmount={fillAmountFor(n)}
            bodyColor={bodyColor}
            emptyColor={emptyColor}
          />
        )
      )}
      {showValue ? (
        <AppText
          variant="mono"
          tone={onDark ? "onImage" : "muted"}
          style={{ marginLeft: 8 }}
        >
          {value.toFixed(1)}
        </AppText>
      ) : null}
    </View>
  );
};

export default RatingPips;
