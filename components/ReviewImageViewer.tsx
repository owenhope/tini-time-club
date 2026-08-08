import React from "react";
import { Modal, Pressable, useWindowDimensions } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { makeStyles } from "@/theme";

const DEFAULT_REVIEW_ASPECT_RATIO = 16 / 11;

const fitContainedSize = (
  maxWidth: number,
  maxHeight: number,
  aspectRatio: number
) => {
  if (maxWidth / maxHeight > aspectRatio) {
    return { width: maxHeight * aspectRatio, height: maxHeight };
  }

  return { width: maxWidth, height: maxWidth / aspectRatio };
};

interface ReviewImageViewerProps {
  visible: boolean;
  imageUrl: string;
  onClose: () => void;
}

const ReviewImageViewer: React.FC<ReviewImageViewerProps> = ({
  visible,
  imageUrl,
  onClose,
}) => {
  const styles = useStyles();
  const { width, height } = useWindowDimensions();
  const [loadedImage, setLoadedImage] = React.useState<{
    url: string;
    aspectRatio: number;
  } | null>(null);
  const aspectRatio =
    loadedImage?.url === imageUrl
      ? loadedImage.aspectRatio
      : DEFAULT_REVIEW_ASPECT_RATIO;
  const imageSize = fitContainedSize(
    Math.max(1, width - 32),
    Math.max(1, height - 120),
    aspectRatio
  );

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
        <Pressable
          testID="review-image-stage"
          style={[styles.stage, imageSize]}
          onPress={() => {}}
        >
          <ExpoImage
            source={{ uri: imageUrl }}
            style={styles.image}
            contentFit="contain"
            transition={150}
            cachePolicy="memory-disk"
            onLoad={({ source }) => {
              if (source.width > 0 && source.height > 0) {
                setLoadedImage({
                  url: imageUrl,
                  aspectRatio: source.width / source.height,
                });
              }
            }}
            accessible
            accessibilityRole="image"
            accessibilityLabel="Expanded review photo"
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const useStyles = makeStyles((t) => ({
  backdrop: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.scrimStrong,
    padding: t.spacing.lg,
  },
  stage: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  image: {
    width: "100%" as const,
    height: "100%" as const,
  },
}));

export default ReviewImageViewer;
