import React, { useEffect } from "react";
import { Modal, Pressable } from "react-native";
import { Image } from "expo-image";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { AppText } from "@/components/shared";
import { makeStyles } from "@/theme";

interface MartiniImagePreviewProps {
  visible: boolean;
  source: number;
  title: string;
  onClose: () => void;
}

const MAX_ZOOM = 4;

export default function MartiniImagePreview({
  visible,
  source,
  title,
  onClose,
}: MartiniImagePreviewProps) {
  const styles = useStyles();
  const scale = useSharedValue(1);
  const startScale = useSharedValue(1);

  useEffect(() => {
    if (!visible) scale.value = 1;
  }, [scale, visible]);

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = scale.value;
    })
    .onUpdate(({ scale: gestureScale }) => {
      // Reanimated shared values are mutable by design inside UI worklets.
      // eslint-disable-next-line react-hooks/immutability
      scale.value = Math.min(
        MAX_ZOOM,
        Math.max(1, startScale.value * gestureScale)
      );
    })
    .onEnd(() => {
      if (scale.value < 1.02) {
        // Reanimated shared values are mutable by design inside UI worklets.
        // eslint-disable-next-line react-hooks/immutability
        scale.value = withTiming(1);
      }
    });

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <GestureHandlerRootView style={styles.screen}>
        <StatusBar style="light" />
        <GestureDetector gesture={pinchGesture}>
          <Animated.View style={[styles.imageCanvas, imageStyle]}>
            <Image
              source={source}
              style={styles.image}
              contentFit="contain"
              accessibilityLabel={`${title} enlarged preview`}
            />
          </Animated.View>
        </GestureDetector>
        <AppText variant="caption" style={styles.title}>
          {title}
        </AppText>
        <Pressable
          onPress={onClose}
          style={styles.closeButton}
          accessibilityRole="button"
          accessibilityLabel="Close enlarged preview"
        >
          <Ionicons name="close" size={25} color="#FFFFFF" />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}

const useStyles = makeStyles((t) => ({
  screen: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surfaceInkDeep,
  },
  imageCanvas: {
    width: "100%" as const,
    height: "78%" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  image: {
    width: "100%" as const,
    height: "100%" as const,
  },
  title: {
    position: "absolute" as const,
    bottom: t.spacing.xxl,
    color: t.colors.onInk,
  },
  closeButton: {
    position: "absolute" as const,
    top: t.spacing.xxl,
    right: t.spacing.lg,
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.42)",
  },
}));
