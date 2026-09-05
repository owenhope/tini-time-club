import React, { useId } from "react";
import { AccessibilityInfo, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { RANK_TIERS } from "@/utils/ranking";

/** Six-second left-to-right sheen, using the avatar ring's rank palette. */
export function RankGradient({ color }: { color: string }) {
  const tier = RANK_TIERS.find((item) => item.color === color) ?? RANK_TIERS[0];
  const id = `passport-${useId().replace(/:/g, "")}`;
  const phase = useSharedValue(0);
  const width = useSharedValue(0);
  React.useEffect(() => {
    let mounted = true;
    let changed = false;
    const update = (reduce: boolean) => {
      cancelAnimation(phase);
      phase.value = 0;
      if (!reduce)
        phase.value = withRepeat(
          withTiming(1, { duration: 6000, easing: Easing.linear }),
          -1
        );
    };
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (reduce) => {
        changed = true;
        update(reduce);
      }
    );
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((reduce) => {
        if (mounted && !changed) update(reduce);
      })
      .catch(() => {});
    return () => {
      mounted = false;
      subscription.remove();
      cancelAnimation(phase);
    };
  }, [phase]);
  const motion = useAnimatedStyle(() => ({
    transform: [{ translateX: (phase.value - 1) * width.value }],
  }));
  return (
    <View
      style={{ flex: 1, overflow: "hidden", backgroundColor: tier.color }}
      pointerEvents="none"
      onLayout={(event) => {
        width.value = event.nativeEvent.layout.width;
      }}
    >
      <Animated.View style={[{ width: "200%", height: "100%" }, motion]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} x1="0%" y1="0%" x2="100%" y2="0%">
              <Stop offset="0" stopColor={tier.sheen} stopOpacity="0" />
              <Stop offset="0.2" stopColor={tier.sheen} stopOpacity="0.15" />
              <Stop offset="0.35" stopColor={tier.sheen} stopOpacity="0.9" />
              <Stop offset="0.5" stopColor={tier.sheen} stopOpacity="0.15" />
              <Stop offset="0.65" stopColor={tier.sheen} stopOpacity="0.9" />
              <Stop offset="0.8" stopColor={tier.sheen} stopOpacity="0.15" />
              <Stop offset="1" stopColor={tier.sheen} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </Animated.View>
    </View>
  );
}
