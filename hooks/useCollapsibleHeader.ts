import { useCallback, useRef, useState } from "react";
import {
  Animated,
  type NativeSyntheticEvent,
  type NativeScrollEvent,
} from "react-native";

/**
 * Every collapsing header finishes its transition over the same scroll
 * distance, so the gesture feels identical on the feed, the place profile
 * and anywhere else.
 */
const COLLAPSE_RANGE = 120;

/**
 * Scroll-driven header collapse.
 *
 * `progress` tracks the finger 1:1 — 0 at the top, 1 once the content has
 * scrolled COLLAPSE_RANGE points — so the header shrinks exactly as fast as
 * the user scrolls, and reverses the same way. Drive transforms/opacity/height
 * from it with `progress.interpolate(...)`.
 *
 * `isCollapsed` flips at the midpoint for consumers that need a discrete
 * state (accessibility, pointerEvents), not for driving animations.
 */
export const useCollapsibleHeader = (range: number = COLLAPSE_RANGE) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  // Ref rather than state: onScroll fires continuously and we only want to
  // re-render on the transition, not on every frame.
  const collapsedRef = useRef(false);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      progress.setValue(Math.max(0, Math.min(1, y / range)));

      const next = y > range / 2;
      if (collapsedRef.current !== next) {
        collapsedRef.current = next;
        setIsCollapsed(next);
      }
    },
    [progress, range]
  );

  const collapsibleStyle = {
    opacity: progress.interpolate({
      inputRange: [0, 1],
      outputRange: [1, 0],
    }),
  };

  return { isCollapsed, onScroll, progress, collapsibleStyle };
};
