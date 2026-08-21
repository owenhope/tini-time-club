import React, { useRef, useState } from "react";
import { Animated, Modal, Pressable, StyleSheet } from "react-native";
import { Image as ExpoImage } from "expo-image";
import {
  PanGestureHandler,
  PinchGestureHandler,
  State,
} from "react-native-gesture-handler";
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
  const [panEvent] = useState(() =>
    Animated.event([{ nativeEvent: { translationY: panY } }], {
      useNativeDriver: true,
    })
  );
  const pinchRef = useRef(null);
  const panRef = useRef(null);

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

  const handlePanStateChange = ({ nativeEvent }: any) => {
    if (nativeEvent.oldState !== State.ACTIVE) return;
    const isDownwardSwipe =
      nativeEvent.translationY > 120 &&
      Math.abs(nativeEvent.translationY) > Math.abs(nativeEvent.translationX);
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
          onPress={closeViewer}
          accessibilityRole="button"
          accessibilityLabel="Close review photo"
        />
        <Animated.View
          style={[styles.imageStage, { transform: [{ translateY: panY }] }]}
          onLayout={({ nativeEvent }) => setStageSize(nativeEvent.layout)}
        >
          <Pressable
            style={[styles.imageHitbox, imageFrameStyle]}
            onPress={(event) => event.stopPropagation()}
          >
            <PanGestureHandler
              ref={panRef}
              simultaneousHandlers={pinchRef}
              onGestureEvent={panEvent}
              onHandlerStateChange={handlePanStateChange}
            >
              <PinchGestureHandler
                ref={pinchRef}
                simultaneousHandlers={panRef}
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
            </PanGestureHandler>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.colors.scrimStrong,
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
}));

export default ReviewImageViewer;
