import React from "react";
import { Pressable, View, type StyleProp, type ViewStyle } from "react-native";
import { HIT_SLOP, useTheme } from "@/theme";
import AppText from "./AppText";

export const PIPS_MAX = 5;

export interface RatingPipsProps {
  /** 0–max. Halves round to the nearest whole pip. */
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
  filled: boolean;
  onDark?: boolean;
  bodyColor?: string;
  emptyColor?: string;
}> = ({ size, filled, onDark, bodyColor, emptyColor }) => {
  const { colors } = useTheme();
  // The olive is green — `secondary`, not `accent`. The brand's primary is
  // the purple, and a purple olive is not an olive.
  const body = bodyColor ?? (onDark ? colors.textOnImage : colors.secondary);

  return (
    <View
      style={{
        width: size * 0.84,
        height: size,
        // A true ellipse — the olive is taller than it is wide. RN accepts a
        // percentage radius, which an equal-sided value would not give us.
        borderRadius: "50%",
        backgroundColor: filled ? body : "transparent",
        borderWidth: filled ? 0 : 2,
        borderColor: emptyColor ?? colors.ratingPipEmpty,
      }}
    >
      {filled ? (
        <View
          style={{
            position: "absolute",
            top: size * 0.16,
            right: size * 0.1,
            width: size * 0.3,
            height: size * 0.3,
            borderRadius: "50%",
            backgroundColor: colors.ratingPipDot,
          }}
        />
      ) : null}
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
  const filledThrough = Math.round(value);
  const pips = Array.from({ length: max }, (_, i) => i + 1);

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
            onPress={() => onRate(n)}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Rate ${n} of ${max}`}
            accessibilityState={{ selected: n <= filledThrough }}
          >
            <Olive
              size={size}
              filled={n <= filledThrough}
              onDark={onDark}
              bodyColor={bodyColor}
              emptyColor={emptyColor}
            />
          </Pressable>
        ) : (
          <Olive
            key={n}
            size={size}
            filled={n <= filledThrough}
            onDark={onDark}
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
