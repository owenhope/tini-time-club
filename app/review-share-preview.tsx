import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  PixelRatio,
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { captureRef } from "react-native-view-shot";
import ReviewShareCard, {
  type ReviewSharePhotoPosition,
} from "@/components/review-share/ReviewShareCard";
import { AppText, Button } from "@/components/shared";
import databaseService from "@/services/databaseService";
import { makeStyles, useTheme } from "@/theme";
import type { Review } from "@/types/types";
import {
  InstagramReviewShareError,
  shareReviewImageToInstagram,
} from "@/utils/instagramReviewShare";
import { reportError } from "@/utils/log";
import { logReviewShare, publicReviewUrl } from "@/utils/reviewShare";
import { routes, type ReviewShareFormat } from "@/utils/routes";

const DEFAULT_POSITION: ReviewSharePhotoPosition = { x: 0, y: 0 };
const INSTAGRAM_EXPORT_WIDTH = 1080;
const INSTAGRAM_EXPORT_HEIGHT: Record<ReviewShareFormat, number> = {
  story: 1920,
  post: 1350,
};
const STORY_ARTWORK_SCALE = 0.96;

export default function ReviewSharePreviewScreen() {
  const params = useLocalSearchParams<{
    reviewId?: string;
  }>();
  const reviewId = Array.isArray(params.reviewId)
    ? params.reviewId[0]
    : params.reviewId;
  const [format] = useState<ReviewShareFormat>("story");
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageReady, setImageReady] = useState(false);
  const [sharing, setSharing] = useState(false);
  const cardRef = useRef<View>(null);
  const trackedFormats = useRef(new Set<ReviewShareFormat>());
  const [positions, setPositions] = useState<
    Record<ReviewShareFormat, ReviewSharePhotoPosition>
  >({
    story: DEFAULT_POSITION,
    post: DEFAULT_POSITION,
  });
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { colors } = useTheme();
  const styles = useStyles();

  useEffect(() => {
    let cancelled = false;

    const loadReview = async () => {
      if (!reviewId) {
        setError("This review is missing an id.");
        setLoading(false);
        return;
      }

      try {
        const data = await databaseService.getReview(reviewId);
        if (!cancelled) {
          setReview(data);
          setError(null);
        }
      } catch (loadError) {
        reportError("Error loading review share preview:", loadError);
        if (!cancelled) setError("We couldn't load this review.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void loadReview();
    return () => {
      cancelled = true;
    };
  }, [reviewId]);

  useEffect(() => {
    if (!review || trackedFormats.current.has(format)) return;

    trackedFormats.current.add(format);
    void logReviewShare(
      review.id,
      format === "story" ? "instagram_story" : "instagram_post",
      "previewed"
    );
  }, [format, review]);

  const canvasSize = useMemo(() => {
    const targetAspect = format === "story" ? 9 / 16 : 4 / 5;
    const horizontalGutter = 32;
    const editorChrome = 200;
    const maxWidth = Math.max(220, windowWidth - horizontalGutter);
    const maxHeight = Math.max(
      320,
      windowHeight - insets.top - insets.bottom - editorChrome
    );
    const width = Math.min(maxWidth, maxHeight * targetAspect);

    return { width, height: width / targetAspect };
  }, [format, insets.bottom, insets.top, windowHeight, windowWidth]);

  const artworkSize = useMemo(() => {
    const scale = format === "story" ? STORY_ARTWORK_SCALE : 1;
    return {
      width: canvasSize.width * scale,
      height: canvasSize.height * scale,
    };
  }, [canvasSize.height, canvasSize.width, format]);

  const goBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(routes.home());
    }
  }, [router]);

  const updatePhotoPosition = useCallback(
    (position: ReviewSharePhotoPosition) => {
      setPositions((current) => ({ ...current, [format]: position }));
    },
    [format]
  );

  const openInInstagram = useCallback(async () => {
    if (!review || !cardRef.current || !imageReady || sharing) return;

    const destination =
      format === "story" ? "instagram_story" : "instagram_post";
    setSharing(true);

    try {
      // iOS interprets capture dimensions as points and renders at the device
      // scale; Android interprets them as final pixels.
      const captureScale = Platform.OS === "ios" ? PixelRatio.get() : 1;
      const imageUri = await captureRef(cardRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
        width: INSTAGRAM_EXPORT_WIDTH / captureScale,
        height: INSTAGRAM_EXPORT_HEIGHT[format] / captureScale,
      });

      await shareReviewImageToInstagram({
        imageUri,
        format,
        attributionUrl: publicReviewUrl(review.id),
      });
      await logReviewShare(review.id, destination, "opened");
    } catch (shareError) {
      if (shareError instanceof InstagramReviewShareError) {
        await logReviewShare(review.id, destination, "unavailable");

        if (shareError.code === "not_installed") {
          Alert.alert(
            "Instagram unavailable",
            "Install Instagram to finish sharing this review."
          );
          return;
        }

        if (shareError.code === "story_not_configured") {
          Alert.alert(
            "Instagram Stories unavailable",
            "Story sharing still needs the Meta app ID configured for this build."
          );
          return;
        }
      }

      reportError("Instagram review handoff failed:", shareError);

      const message =
        shareError instanceof Error ? shareError.message.toLowerCase() : "";
      if (message.includes("photo library")) {
        Alert.alert(
          "Photos access needed",
          "Allow All Photos access so Tini Time Club can add the review card to an Instagram post.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => void Linking.openSettings(),
            },
          ]
        );
      } else {
        Alert.alert(
          "Couldn't open Instagram",
          "The review card could not be handed off. Please try again."
        );
      }
      await logReviewShare(review.id, destination, "failed");
    } finally {
      setSharing(false);
    }
  }, [format, imageReady, review, sharing]);

  const isReady = !loading;
  const unavailable =
    isReady &&
    (Boolean(error) || !review || !review.image_url?.trim() || imageError);

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [
            styles.closeButton,
            pressed && styles.pressed,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Close share preview"
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={25} color={colors.text} />
        </Pressable>
        <Text style={styles.title}>Share Review</Text>
        <View style={styles.headerBalance} />
      </View>

      <View style={styles.previewStage}>
        {!isReady ? (
          <ActivityIndicator size="large" color={colors.accent} />
        ) : unavailable ? (
          <View style={styles.unavailable}>
            <Ionicons name="image-outline" size={36} color={colors.textMuted} />
            <AppText variant="heading" tone="default" style={styles.centerText}>
              Image sharing unavailable
            </AppText>
            <AppText variant="body" tone="secondary" style={styles.centerText}>
              {error || "This review doesn't have a usable photo."}
            </AppText>
          </View>
        ) : review ? (
          <View
            style={[
              styles.canvasFrame,
              {
                width: canvasSize.width,
                height: canvasSize.height,
              },
            ]}
          >
            <View
              style={[
                styles.captureCanvas,
                {
                  width: canvasSize.width,
                  height: canvasSize.height,
                  backgroundColor: "transparent",
                },
              ]}
            >
              <View
                ref={cardRef}
                collapsable={false}
                style={[
                  styles.artworkFrame,
                  { width: artworkSize.width, height: artworkSize.height },
                ]}
              >
                <ReviewShareCard
                  key={format}
                  review={review}
                  format={format}
                  width={artworkSize.width}
                  height={artworkSize.height}
                  photoPosition={positions[format]}
                  onPhotoPositionChange={updatePhotoPosition}
                  onImageLoad={() => setImageReady(true)}
                  onImageError={() => {
                    setImageReady(false);
                    setImageError(true);
                  }}
                />
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <Button
          title="Open Story in Instagram"
          onPress={() => void openInInstagram()}
          loading={sharing}
          disabled={unavailable || !imageReady}
          icon="logo-instagram"
          iconPosition="left"
          fullWidth
          accessibilityHint="Renders this preview as an image and opens Instagram to finish publishing"
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    height: 54,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: t.spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: t.radius.pill,
  },
  pressed: {
    backgroundColor: t.colors.pressed,
    opacity: 0.76,
  },
  title: {
    ...t.typography.heading,
    letterSpacing: 0,
    color: t.colors.text,
  },
  headerBalance: {
    width: 44,
    height: 44,
  },
  previewStage: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.lg,
  },
  canvasFrame: {
    overflow: "hidden" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: t.radius.xs,
    borderCurve: "continuous" as const,
    backgroundColor: "transparent",
  },
  captureCanvas: {
    overflow: "hidden" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: t.radius.xs,
    borderCurve: "continuous" as const,
  },
  artworkFrame: {
    overflow: "hidden" as const,
    borderRadius: t.radius.xs,
    borderCurve: "continuous" as const,
  },
  unavailable: {
    maxWidth: 290,
    alignItems: "center" as const,
    gap: t.spacing.sm,
    padding: t.spacing.xl,
  },
  centerText: {
    textAlign: "center" as const,
  },
  controls: {
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.md,
    gap: t.spacing.sm,
  },
}));
