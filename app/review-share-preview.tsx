import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ReviewShareCard, {
  type ReviewSharePhotoPosition,
} from "@/components/review-share/ReviewShareCard";
import { AppText, SegmentedControl } from "@/components/shared";
import databaseService from "@/services/databaseService";
import { makeStyles, useTheme } from "@/theme";
import type { Review } from "@/types/types";
import { reportError } from "@/utils/log";
import { routes, type ReviewShareFormat } from "@/utils/routes";

const FORMATS = [
  { value: "story", label: "Story" },
  { value: "post", label: "Post" },
] as const;

const DEFAULT_POSITION: ReviewSharePhotoPosition = { x: 0, y: 0 };

const isShareFormat = (value?: string): value is ReviewShareFormat =>
  value === "story" || value === "post";

export default function ReviewSharePreviewScreen() {
  const params = useLocalSearchParams<{
    reviewId?: string;
    format?: string;
  }>();
  const reviewId = Array.isArray(params.reviewId)
    ? params.reviewId[0]
    : params.reviewId;
  const initialFormat = Array.isArray(params.format)
    ? params.format[0]
    : params.format;
  const [format, setFormat] = useState<ReviewShareFormat>(
    isShareFormat(initialFormat) ? initialFormat : "story"
  );
  const [review, setReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
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

  const canvasSize = useMemo(() => {
    const targetAspect = format === "story" ? 9 / 16 : 4 / 5;
    const horizontalGutter = 32;
    const editorChrome = 136;
    const maxWidth = Math.max(220, windowWidth - horizontalGutter);
    const maxHeight = Math.max(
      320,
      windowHeight - insets.top - insets.bottom - editorChrome
    );
    const width = Math.min(maxWidth, maxHeight * targetAspect);

    return { width, height: width / targetAspect };
  }, [format, insets.bottom, insets.top, windowHeight, windowWidth]);

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
          <View style={styles.canvasFrame}>
            <ReviewShareCard
              review={review}
              format={format}
              width={canvasSize.width}
              height={canvasSize.height}
              photoPosition={positions[format]}
              onPhotoPositionChange={updatePhotoPosition}
              onImageError={() => setImageError(true)}
            />
          </View>
        ) : null}
      </View>

      <View style={styles.controls}>
        <SegmentedControl
          value={format}
          options={FORMATS}
          onChange={(nextFormat) => {
            setImageError(false);
            setFormat(nextFormat);
          }}
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
    borderRadius: t.radius.xs,
    borderCurve: "continuous" as const,
    backgroundColor: t.colors.surfaceInkDeep,
    boxShadow: t.isDark
      ? "0 14px 34px rgba(0,0,0,0.3)"
      : "0 14px 34px rgba(20,26,23,0.18)",
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
  },
}));
