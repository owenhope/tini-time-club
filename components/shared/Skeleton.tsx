import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { makeStyles } from "@/theme";

export interface SkeletonProps {
  /** Width of the block; numbers are points, strings are percentages. */
  width?: DimensionValue;
  /** Height of the block in points. Circles use this as their diameter. */
  height?: number;
  /** Render as a circle (avatar placeholder). */
  circle?: boolean;
  /** Corner radius for non-circle blocks. */
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * Pulsing placeholder block shown while content loads. Size skeletons to the
 * dimensions of the content they stand in for, so the layout doesn't shift
 * when real data arrives.
 */
const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = 14,
  circle = false,
  radius = 6,
  style,
}) => {
  const styles = useStyles();
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.5,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 650,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.base,
        {
          width: circle ? height : width,
          height,
          borderRadius: circle ? height / 2 : radius,
          opacity: pulse,
        },
        style,
      ]}
    />
  );
};

const useStyles = makeStyles((t) => ({
  base: {
    backgroundColor: t.colors.skeleton,
  },
}));

export default Skeleton;
