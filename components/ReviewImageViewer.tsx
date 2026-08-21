import React, { useRef, useState } from "react";
import { Animated, Modal, Pressable } from "react-native";
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
 * Modal supplies the only animation). Pinch to zoom; use the close control to
 * dismiss so a second finger never gets mistaken for a backdrop tap.
 */
const ReviewImageViewer: React.FC<ReviewImageViewerProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const styles = useStyles();
  const [zoom, setZoom] = useState(1);
  const zoomRef = useRef(1);
  const [pinchScale] = useState(() => new Animated.Value(1));
  const [pinchEvent] = useState(() =>
    Animated.event([{ nativeEvent: { scale: pinchScale } }], {
      useNativeDriver: true,
    })
  );

  const resetZoom = () => {
    zoomRef.current = 1;
    setZoom(1);
    pinchScale.setValue(1);
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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <PinchGestureHandler
        onGestureEvent={pinchEvent}
        onHandlerStateChange={handlePinchStateChange}
      >
        <Animated.View style={styles.backdrop}>
          <Animated.View
            style={[
              styles.imageStage,
              { transform: [{ scale: zoom }, { scale: pinchScale }] },
            ]}
          >
            <ExpoImage
              source={{ uri: imageUrl }}
              style={styles.image}
              contentFit="contain"
              transition={0}
              cachePolicy="memory-disk"
              accessible
              accessibilityRole="image"
              accessibilityLabel="Expanded review photo"
            />
          </Animated.View>
          <Pressable
            style={styles.closeButton}
            onPress={() => {
              resetZoom();
              onClose();
            }}
            accessibilityRole="button"
            accessibilityLabel="Close review photo"
          >
            <Ionicons name="close" size={25} color="#FFFFFF" />
          </Pressable>
        </Animated.View>
      </PinchGestureHandler>
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    backgroundColor: t.colors.scrimStrong,
    padding: t.spacing.lg,
  },
  image: {
    flex: 1,
    width: "100%" as const,
  },
  imageStage: {
    flex: 1,
    width: "100%" as const,
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

export default ReviewImageViewer;
