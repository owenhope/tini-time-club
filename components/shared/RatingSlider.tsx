import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, Animated, PanResponder } from "react-native";
import * as Haptics from "expo-haptics";
import { makeStyles, useTheme } from "@/theme";

const THUMB_SIZE = 34;
const STOP_SIZE = 10;
const TRACK_HEIGHT = 6;

export interface RatingSliderProps {
  /** Current rating, 1..count. 0 means not rated yet. */
  value: number;
  onChange: (value: number) => void;
  /** One label per stop, shown above the slider and updated live. */
  labels: string[];
  count?: number;
  /** Fill/thumb colour — keeps taste and presentation visually distinct. */
  accentColor?: string;
  accessibilityLabel?: string;
}

/**
 * Discrete slider for grading a drink: a track with `count` stops and a
 * draggable thumb that snaps between them. The label above changes as the
 * thumb moves, same wording as the old tap-a-glass picker.
 */
const RatingSlider: React.FC<RatingSliderProps> = ({
  value,
  onChange,
  labels,
  count = 5,
  accentColor,
  accessibilityLabel,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const accent = accentColor ?? colors.accent;

  const [trackWidth, setTrackWidth] = useState(0);
  const thumbX = useRef(new Animated.Value(0)).current;

  // Refs so the PanResponder (created once) always sees current values.
  const trackWidthRef = useRef(0);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  valueRef.current = value;
  onChangeRef.current = onChange;

  const stepWidth = count > 1 ? trackWidth / (count - 1) : 0;

  const positionFor = useCallback(
    (v: number, width: number) =>
      count > 1 ? ((Math.max(1, v) - 1) / (count - 1)) * width : 0,
    [count]
  );

  // Snap the thumb to the current value (springy, follows drag steps too).
  useEffect(() => {
    if (trackWidth === 0) return;
    Animated.spring(thumbX, {
      toValue: positionFor(value, trackWidth),
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  }, [value, trackWidth, positionFor, thumbX]);

  const setFromX = useCallback(
    (x: number) => {
      const width = trackWidthRef.current;
      if (width === 0) return;
      const step = width / (count - 1);
      const next = Math.min(count, Math.max(1, Math.round(x / step) + 1));
      if (next !== valueRef.current) {
        Haptics.selectionAsync();
        onChangeRef.current(next);
      }
    },
    [count]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => setFromX(evt.nativeEvent.locationX),
      onPanResponderMove: (evt) => setFromX(evt.nativeEvent.locationX),
    })
  ).current;

  const rated = value >= 1;

  return (
    <View style={styles.container}>
      <Text
        style={[styles.label, rated && { color: accent }]}
        numberOfLines={1}
      >
        {rated ? labels[value - 1] : "Slide to rate"}
      </Text>
      <Text style={styles.score}>
        {rated ? (
          <>
            <Text style={[styles.scoreValue, { color: accent }]}>{value}</Text>
            {` out of ${count}`}
          </>
        ) : (
          `out of ${count}`
        )}
      </Text>

      <View
        style={styles.touchArea}
        {...panResponder.panHandlers}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel ?? "Rating"}
        accessibilityValue={{
          min: 1,
          max: count,
          now: rated ? value : undefined,
          text: rated ? labels[value - 1] : "Not rated yet",
        }}
        accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
        onAccessibilityAction={(e) => {
          const current = rated ? value : 0;
          if (e.nativeEvent.actionName === "increment") {
            onChange(Math.min(count, current + 1));
          } else {
            onChange(Math.max(1, current - 1));
          }
        }}
      >
        <View
          style={styles.trackArea}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            trackWidthRef.current = width;
            setTrackWidth(width);
            thumbX.setValue(positionFor(valueRef.current, width));
          }}
        >
          <View style={styles.track}>
            {rated && (
              <View
                style={[
                  styles.trackFill,
                  {
                    backgroundColor: accent,
                    // Fills from the left edge up to the current stop; the
                    // thumb's spring catches up on top of it.
                    width: positionFor(value, trackWidth),
                  },
                ]}
              />
            )}
          </View>
          {Array.from({ length: count }, (_, i) => (
            <View
              key={i}
              style={[
                styles.stop,
                { left: positionFor(i + 1, trackWidth) - STOP_SIZE / 2 },
                rated && i + 1 <= value && { backgroundColor: accent },
              ]}
            />
          ))}
          <Animated.View
            style={[
              styles.thumb,
              rated ? { backgroundColor: accent } : styles.thumbUnrated,
              { transform: [{ translateX: thumbX }] },
            ]}
          >
            {rated && <Text style={styles.thumbValue}>{value}</Text>}
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    width: "100%" as const,
    gap: t.spacing.md,
  },
  label: {
    ...t.typography.title,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
  },
  score: {
    ...t.typography.body,
    color: t.colors.textMuted,
    textAlign: "center" as const,
  },
  scoreValue: {
    ...t.typography.bodyStrong,
    fontVariant: ["tabular-nums"] as const,
  },
  touchArea: {
    paddingVertical: t.spacing.md,
    paddingHorizontal: THUMB_SIZE / 2,
  },
  trackArea: {
    height: THUMB_SIZE,
    justifyContent: "center" as const,
  },
  track: {
    height: TRACK_HEIGHT,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.ratingTrack,
    overflow: "hidden" as const,
  },
  // Clipped fill: translated so its right edge rides with the thumb.
  trackFill: {
    position: "absolute" as const,
    left: 0,
    top: 0,
    bottom: 0,
  },
  stop: {
    position: "absolute" as const,
    width: STOP_SIZE,
    height: STOP_SIZE,
    borderRadius: STOP_SIZE / 2,
    backgroundColor: t.colors.borderStrong,
  },
  thumb: {
    position: "absolute" as const,
    left: -THUMB_SIZE / 2,
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    ...t.elevation.raised,
  },
  thumbValue: {
    ...t.typography.bodyStrong,
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"] as const,
  },
  thumbUnrated: {
    backgroundColor: t.colors.borderStrong,
    opacity: 0.6,
  },
}));

export default RatingSlider;
