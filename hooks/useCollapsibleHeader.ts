import { useCallback, useRef, useState } from "react";
import {
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";

const DEFAULT_THRESHOLD = 40;
const DURATION = 180;

/**
 * Scroll-driven header collapse.
 *
 * The user profile, own profile and place profile each had their own copy of
 * this Animated setup with slightly different thresholds and durations, so
 * the same gesture felt different on each screen. One hook, one behaviour.
 */
export const useCollapsibleHeader = (threshold: number = DEFAULT_THRESHOLD) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  // Ref rather than state: onScroll fires continuously and we only want to
  // animate on the transition, not on every frame.
  const collapsedRef = useRef(false);

  const setCollapsed = useCallback(
    (next: boolean) => {
      if (collapsedRef.current === next) return;
      collapsedRef.current = next;
      setIsCollapsed(next);
      Animated.timing(progress, {
        toValue: next ? 1 : 0,
        duration: DURATION,
        useNativeDriver: false, // drives height, which native driver can't
      }).start();
    },
    [progress]
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setCollapsed(event.nativeEvent.contentOffset.y > threshold);
    },
    [setCollapsed, threshold]
  );

  const collapsibleStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  };

  return { isCollapsed, onScroll, progress, collapsibleStyle };
};

export default useCollapsibleHeader;
