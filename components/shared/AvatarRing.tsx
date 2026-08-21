import React, { useEffect, useId, useState } from "react";
import { AccessibilityInfo, View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";
import { getRankTier } from "@/utils/ranking";

interface AvatarRingProps {
  /** Active review count driving the tier; nullish counts as zero. */
  reviewCount?: number | null;
  /** Diameter of the avatar being wrapped. */
  size: number;
  children: React.ReactNode;
}

const getBorderWidth = (size: number): number => {
  if (size < 36) return 3;
  if (size < 64) return 4;
  return 6;
};

/** Extra pixels AvatarRing adds around each edge of an avatar. */
export const ringInset = (reviewCount?: number | null, size = 40): number =>
  getRankTier(reviewCount) ? getBorderWidth(size) + 1 : 0;

const ROTATION_DURATION_MS = 6000;
// SVG strokes are centered on their path. Leave a small inset between the
// stroke and the viewport so its antialiased outer edge is not clipped.
const STROKE_VIEWPORT_INSET = 1;

/**
 * The rank ring: a gradient of the tier color, slowly rotating on the UI
 * thread. The gradient runs shade → sheen → shade so the seam is invisible
 * as it spins. Reduced-motion settings leave the ring still (the gradient
 * itself stays, so tiers remain distinguishable).
 */
const AvatarRing: React.FC<AvatarRingProps> = ({
  reviewCount,
  size,
  children,
}) => {
  const tier = getRankTier(reviewCount);
  // SVG gradient ids are document-global; scope per instance so a feed of
  // rings doesn't resolve every stroke to the first mounted tier. useId's
  // colons are stripped — they're invalid inside a url(#...) reference.
  const gradientId = `ring-${useId().replace(/:/g, "")}`;
  const rotation = useSharedValue(0);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) setReduceMotion(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion
    );
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  const shouldAnimate = Boolean(tier && !reduceMotion);

  useEffect(() => {
    if (!shouldAnimate) {
      cancelAnimation(rotation);
      rotation.value = 0;
      return;
    }

    rotation.value = withRepeat(
      withTiming(360, {
        duration: ROTATION_DURATION_MS,
        easing: Easing.linear,
      }),
      -1
    );
    return () => {
      cancelAnimation(rotation);
      rotation.value = 0;
    };
  }, [rotation, shouldAnimate]);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  if (!tier) return <>{children}</>;

  const inset = ringInset(reviewCount, size);
  const diameter = size + inset * 2;
  const borderWidth = getBorderWidth(size);
  const center = diameter / 2;

  return (
    <View
      style={{
        width: diameter,
        height: diameter,
        alignItems: "center",
        justifyContent: "center",
      }}
      accessibilityLabel={`${tier.name} rank`}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            width: diameter,
            height: diameter,
          },
          spinStyle,
        ]}
      >
        <Svg width={diameter} height={diameter}>
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor={tier.shade} />
              <Stop offset="0.5" stopColor={tier.sheen} />
              <Stop offset="1" stopColor={tier.shade} />
            </LinearGradient>
          </Defs>
          <Circle
            cx={center}
            cy={center}
            r={center - borderWidth / 2 - STROKE_VIEWPORT_INSET}
            stroke={`url(#${gradientId})`}
            strokeWidth={borderWidth}
            fill="none"
          />
        </Svg>
      </Animated.View>
      {children}
    </View>
  );
};

export default AvatarRing;
