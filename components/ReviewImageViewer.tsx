import React from "react";
import { Modal, Pressable } from "react-native";
import { Image as ExpoImage } from "expo-image";
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
 * Modal supplies the only animation). Tap anywhere to close.
 */
const ReviewImageViewer: React.FC<ReviewImageViewerProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const styles = useStyles();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={styles.backdrop}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close review photo"
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
      </Pressable>
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
}));

export default ReviewImageViewer;
