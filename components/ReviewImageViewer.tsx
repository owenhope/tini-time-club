import React, { useRef, useState } from "react";
import {
  Animated,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
} from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { PinchGestureHandler, State } from "react-native-gesture-handler";
import { makeStyles } from "@/theme";

interface ReviewImageViewerProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

/**
 * Full-screen lightbox for a review photo. The stage is always the full
 * window and the photo letterboxes itself via contentFit="contain", so no
 * layout depends on the image's dimensions — the previous approach guessed
 * an aspect ratio and then resized the stage when onLoad reported the real
 * one, a visible jump mid-open. The photo is already in expo-image's cache
 * from the feed card, so it paints immediately without its own fade (the
 * Modal supplies the only animation). Pinch to zoom; tapping outside the image
 * or dragging it down dismisses the viewer.
 */
const ReviewImageViewer: React.FC<ReviewImageViewerProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const styles = useStyles();
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [pinchScale] = useState(() => new Animated.Value(1));
  const [panY] = useState(() => new Animated.Value(0));
  const [pinchEvent] = useState(() =>
    Animated.event([{ nativeEvent: { scale: pinchScale } }], {
      useNativeDriver: true,
    })
  );
  const pinchRef = useRef(null);

  const resetZoom = () => {
    zoomRef.current = 1;
    setZoom(1);
    pinchScale.setValue(1);
  };

  const closeViewer = () => {
    resetZoom();
    panY.setValue(0);
    onClose();
  };

  const handlePinchStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState !== State.ACTIVE) return;
    const nextZoom = Math.min(
      4,
      Math.max(1, zoomRef.current * nativeEvent.scale)
    );
    zoomRef.current = nextZoom;
    setZoom(nextZoom);
    pinchScale.setValue(1);
  };

  const finishPan = (translationY: number, translationX: number) => {
    const isDownwardSwipe =
      translationY > 120 && Math.abs(translationY) > Math.abs(translationX);
    if (isDownwardSwipe) {
      closeViewer();
      return;
    }
    Animated.spring(panY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 6,
    }).start();
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.numberActiveTouches === 1 &&
        Math.abs(gestureState.dy) > 10,
      onPanResponderMove: (_, gestureState) => {
        panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        finishPan(gestureState.dy, gestureState.dx);
      },
      onPanResponderTerminate: (_, gestureState) => {
        finishPan(gestureState.dy, gestureState.dx);
      },
    })
  ).current;

  const imageAspectRatio =
    imageSize.width > 0 && imageSize.height > 0
      ? imageSize.width / imageSize.height
      : 0;
  const imageFrameStyle =
    imageAspectRatio > 0 && stageSize.width > 0 && stageSize.height > 0
      ? imageAspectRatio >= stageSize.width / stageSize.height
        ? {
            width: stageSize.width,
            height: stageSize.width / imageAspectRatio,
          }
        : {
            width: stageSize.height * imageAspectRatio,
            height: stageSize.height,
          }
      : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Animated.View style={styles.backdrop}>
        <Pressable
          style={styles.dismissArea}
          onPressIn={closeViewer}
          accessibilityRole="button"
          accessibilityLabel="Close review photo"
        />
        <Animated.View
          style={[styles.imageStage, { transform: [{ translateY: panY }] }]}
          pointerEvents="box-none"
          onLayout={({ nativeEvent }) => setStageSize(nativeEvent.layout)}
        >
          <Animated.View
            style={[styles.imageHitbox, imageFrameStyle]}
            {...panResponder.panHandlers}
          >
            <PinchGestureHandler
              ref={pinchRef}
              onGestureEvent={pinchEvent}
              onHandlerStateChange={handlePinchStateChange}
            >
              <Animated.View
                style={[
                  styles.imageTransform,
                  { transform: [{ scale: zoom }, { scale: pinchScale }] },
                ]}
              >
                <ExpoImage
                  source={{ uri: imageUrl }}
                  style={styles.image}
                  onLoad={({ source }) => {
                    if (source?.width && source?.height) {
                      setImageSize({
                        width: source.width,
                        height: source.height,
                      });
                    }
                  }}
                  contentFit="contain"
                  transition={0}
                  cachePolicy="memory-disk"
                  accessible
                  accessibilityRole="image"
                  accessibilityLabel="Expanded review photo"
                />
              </Animated.View>
            </PinchGestureHandler>
            <Pressable
              style={styles.closeButton}
              onPress={closeViewer}
              accessibilityRole="button"
              accessibilityLabel="Close review photo"
            >
              <Ionicons name="close" size={20} color="#FFFFFF" />
            </Pressable>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    padding: t.spacing.lg,
    justifyContent: "center" as const,
  },
  image: {
    flex: 1,
    width: "100%" as const,
  },
  imageStage: {
    width: "100%" as const,
    height: "78%" as const,
    justifyContent: "center" as const,
  },
  imageHitbox: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  imageTransform: {
    width: "100%" as const,
    height: "100%" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  dismissArea: {
    ...StyleSheet.absoluteFill,
  },
  closeButton: {
    position: "absolute" as const,
    top: t.spacing.sm,
    right: t.spacing.sm,
    width: 40,
    height: 40,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.overlay,
    zIndex: 3,
  },
}));

export default ReviewImageViewer;
