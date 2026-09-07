import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { MartiniIcon, RatingPips } from "@/components/shared";
import { MaterialIcons } from "@expo/vector-icons";
import type { Review } from "@/types/types";
import { fonts, typography } from "@/theme";
import { formatCityRegion, stripNameFromAddress } from "@/utils/helpers";
import { calculateOverallRating, formatRating } from "@/utils/ratingUtils";
import {
  getCoverSize,
  getCropOverflow,
  getDefaultPhotoScale,
  MAX_REVIEW_SHARE_PHOTO_SCALE,
  MIN_REVIEW_SHARE_PHOTO_SCALE,
} from "@/utils/reviewShareCrop";
import { getReviewTagColors } from "@/utils/reviewTagColors";
import type { ReviewShareFormat } from "@/utils/routes";

export interface ReviewSharePhotoPosition {
  /** Normalized offset within the available cover-crop overflow. */
  x: number;
  y: number;
  /** Photo zoom, where 1 is the widest crop that still covers the frame. */
  scale?: number;
}

interface ReviewShareCardProps {
  review: Review;
  format: ReviewShareFormat;
  width: number;
  height: number;
  photoPosition: ReviewSharePhotoPosition;
  onPhotoPositionChange: (position: ReviewSharePhotoPosition) => void;
  onImageLoad?: () => void;
  onImageError?: () => void;
}

const CARD = {
  ink: "#10241B",
  paper: "#FAF9F6",
  purple: "#B6A3E2",
  chartreuse: "#F2FF71",
  gold: "#FFD166",
  // The dark-theme `verified` token: the card sits on an ink scrim, so the
  // marks wear the same deeper purple the app's dark badges do.
  verified: "#8E76C9",
} as const;

const clamp = (value: number, min: number, max: number) => {
  "worklet";
  return Math.min(Math.max(value, min), max);
};

/** The format-agnostic artwork used by both the editor and the later exporter. */
const ReviewShareCard = ({
  review,
  format,
  width,
  height,
  photoPosition,
  onPhotoPositionChange,
  onImageLoad,
  onImageError,
}: ReviewShareCardProps) => {
  const [imageAspect, setImageAspect] = useState<number | null>(null);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const photoScale = useSharedValue(1);
  const startScale = useSharedValue(1);
  const maxOffsetX = useSharedValue(0);
  const maxOffsetY = useSharedValue(0);

  const artworkScale = width / 360;
  const photoFrameHeight = height;
  const imageSize = useMemo(
    () =>
      imageAspect
        ? getCoverSize(imageAspect, width, photoFrameHeight)
        : { width, height: photoFrameHeight },
    [imageAspect, photoFrameHeight, width]
  );
  const defaultPhotoScale = useMemo(
    () =>
      imageAspect
        ? getDefaultPhotoScale(
            imageAspect,
            { width, height },
            { width, height: photoFrameHeight }
          )
        : 1,
    [height, imageAspect, photoFrameHeight, width]
  );

  useEffect(() => {
    const nextScale = photoPosition.scale ?? defaultPhotoScale;
    const overflow = getCropOverflow(
      imageSize,
      { width, height: photoFrameHeight },
      nextScale
    );

    photoScale.value = nextScale;
    maxOffsetX.value = overflow.x;
    maxOffsetY.value = overflow.y;
    translateX.value = photoPosition.x * overflow.x;
    translateY.value = photoPosition.y * overflow.y;
  }, [
    defaultPhotoScale,
    imageSize,
    maxOffsetX,
    maxOffsetY,
    photoPosition.x,
    photoPosition.y,
    photoPosition.scale,
    photoFrameHeight,
    photoScale,
    translateX,
    translateY,
    width,
  ]);

  const updateOffsetsForScale = (nextScale: number) => {
    "worklet";
    const nextMaxX = Math.max(0, (imageSize.width * nextScale - width) / 2);
    const nextMaxY = Math.max(
      0,
      (imageSize.height * nextScale - photoFrameHeight) / 2
    );

    // Reanimated shared values are mutable by design inside UI worklets.
    // eslint-disable-next-line react-hooks/immutability
    maxOffsetX.value = nextMaxX;
    // eslint-disable-next-line react-hooks/immutability
    maxOffsetY.value = nextMaxY;
    // eslint-disable-next-line react-hooks/immutability
    translateX.value = clamp(translateX.value, -nextMaxX, nextMaxX);
    // eslint-disable-next-line react-hooks/immutability
    translateY.value = clamp(translateY.value, -nextMaxY, nextMaxY);
  };

  const commitPhotoPosition = () => {
    "worklet";
    runOnJS(onPhotoPositionChange)({
      x: maxOffsetX.value > 0 ? translateX.value / maxOffsetX.value : 0,
      y: maxOffsetY.value > 0 ? translateY.value / maxOffsetY.value : 0,
      scale: photoScale.value,
    });
  };

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      startX.value = translateX.value;
      startY.value = translateY.value;
    })
    .onUpdate(({ translationX, translationY }) => {
      // Reanimated shared values are mutable by design inside UI worklets.
      // eslint-disable-next-line react-hooks/immutability
      translateX.value = clamp(
        startX.value + translationX,
        -maxOffsetX.value,
        maxOffsetX.value
      );
      // eslint-disable-next-line react-hooks/immutability
      translateY.value = clamp(
        startY.value + translationY,
        -maxOffsetY.value,
        maxOffsetY.value
      );
    })
    .onEnd(commitPhotoPosition);

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      startScale.value = photoScale.value;
    })
    .onUpdate(({ scale: gestureScale }) => {
      // eslint-disable-next-line react-hooks/immutability
      photoScale.value = clamp(
        startScale.value * gestureScale,
        MIN_REVIEW_SHARE_PHOTO_SCALE,
        MAX_REVIEW_SHARE_PHOTO_SCALE
      );
      updateOffsetsForScale(photoScale.value);
    })
    .onEnd(commitPhotoPosition);

  const photoGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: photoScale.value },
    ],
  }));

  const panelPadding = (format === "story" ? 20 : 17) * artworkScale;
  const logoSize = (format === "story" ? 58 : 48) * artworkScale;
  const cityCountry = review.location?.address
    ? formatCityRegion(
        stripNameFromAddress(review.location.name, review.location.address)
      )
    : "";
  const overall = calculateOverallRating(review.taste, review.presentation);
  const spiritColors = getReviewTagColors(review.spirit?.name);
  const typeColors = getReviewTagColors(review.type?.name);
  const chipFontSize = 12 * artworkScale;
  const headline =
    review.location?.name || `${review.profile?.username ?? "TTC"} review`;
  const username = review.profile?.username
    ? `@${review.profile.username}`
    : "@tinitimeclub";

  return (
    <GestureDetector gesture={photoGesture}>
      <Animated.View
        testID={`review-share-card-${format}`}
        style={{ width, height, overflow: "hidden", backgroundColor: CARD.ink }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`${format} share card for ${review.location?.name}`}
      >
        <Animated.View
          style={[
            styles.photo,
            {
              width: imageSize.width,
              height: imageSize.height,
              left: (width - imageSize.width) / 2,
              top: (photoFrameHeight - imageSize.height) / 2,
            },
            animatedImageStyle,
          ]}
        >
          <ExpoImage
            source={{ uri: review.image_url }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            onLoad={({ source }) => {
              if (source.width > 0 && source.height > 0) {
                setImageAspect(source.width / source.height);
              }
              onImageLoad?.();
            }}
            onError={onImageError}
          />
        </Animated.View>

        <Svg
          pointerEvents="none"
          style={StyleSheet.absoluteFill}
          width={width}
          height={height}
        >
          <Defs>
            <LinearGradient id="sharePhotoShade" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#000000" stopOpacity={0.02} />
              <Stop offset="0.36" stopColor="#000000" stopOpacity={0.08} />
              <Stop offset="0.62" stopColor="#000000" stopOpacity={0.58} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.92} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#sharePhotoShade)" />
        </Svg>

        <ExpoImage
          pointerEvents="none"
          source={require("@/assets/images/icon-purple.png")}
          style={[
            styles.logo,
            {
              top: 18 * artworkScale,
              left: 18 * artworkScale,
              width: logoSize,
              height: logoSize,
              borderRadius: 10 * artworkScale,
            },
          ]}
          contentFit="cover"
        />

        <View
          pointerEvents="none"
          style={[
            styles.tagRow,
            { top: 20 * artworkScale, right: 18 * artworkScale },
          ]}
        >
          {review.spirit?.name ? (
            <View
              style={[
                styles.tag,
                {
                  minHeight: 34 * artworkScale,
                  paddingHorizontal: 14 * artworkScale,
                  backgroundColor: spiritColors?.backgroundColor ?? CARD.purple,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.tagText,
                  {
                    fontSize: chipFontSize,
                    lineHeight: 15 * artworkScale,
                    color: spiritColors?.textColor ?? CARD.ink,
                  },
                ]}
              >
                {review.spirit.name.toUpperCase()}
              </Text>
            </View>
          ) : null}
          {review.type?.name ? (
            <View
              style={[
                styles.tag,
                {
                  minHeight: 34 * artworkScale,
                  paddingHorizontal: 14 * artworkScale,
                  backgroundColor:
                    typeColors?.backgroundColor ?? CARD.chartreuse,
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[
                  styles.tagText,
                  {
                    fontSize: chipFontSize,
                    lineHeight: 15 * artworkScale,
                    color: typeColors?.textColor ?? CARD.ink,
                  },
                ]}
              >
                {review.type.name.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.content,
            {
              paddingHorizontal: panelPadding,
              paddingBottom: (format === "story" ? 22 : 18) * artworkScale,
              gap: 10 * artworkScale,
            },
          ]}
        >
          <View style={{ gap: 5 * artworkScale }}>
            <View style={[styles.usernameRow, { gap: 4 * artworkScale }]}>
              <Text
                numberOfLines={1}
                style={[
                  styles.username,
                  {
                    fontSize: 15 * artworkScale,
                    lineHeight: 19 * artworkScale,
                  },
                ]}
              >
                {username}
              </Text>
              {review.profile?.is_verified ? (
                <MaterialIcons
                  name="verified"
                  size={14 * artworkScale}
                  color={CARD.verified}
                  accessibilityLabel="Verified member"
                />
              ) : null}
            </View>
            <View style={{ gap: 3 * artworkScale }}>
              <View
                style={[styles.shareHeadlineRow, { gap: 7 * artworkScale }]}
              >
                {review.location?.is_golden_glass ? (
                  <MartiniIcon
                    size={20 * artworkScale}
                    color={CARD.gold}
                    filled
                  />
                ) : null}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                  style={[
                    styles.headline,
                    styles.shareHeadline,
                    {
                      fontSize: 28 * artworkScale,
                      lineHeight: 32 * artworkScale,
                    },
                  ]}
                >
                  {headline}
                </Text>
                {review.location?.is_location_verified ? (
                  <MaterialIcons
                    name="verified"
                    size={20 * artworkScale}
                    color={CARD.verified}
                    accessibilityLabel="Verified business"
                  />
                ) : null}
              </View>
              {cityCountry ? (
                <Text
                  numberOfLines={1}
                  style={[
                    styles.meta,
                    {
                      fontSize: 14 * artworkScale,
                      lineHeight: 18 * artworkScale,
                    },
                  ]}
                >
                  {cityCountry}
                </Text>
              ) : null}
            </View>
          </View>

          {/* Mirrors ReviewItem's ReviewScores: one prominent overall with
              the olive pips beside it, the two axes as a small caption. */}
          <View
            style={[
              styles.metrics,
              {
                marginTop: 8 * artworkScale,
              },
            ]}
          >
            <View style={{ gap: 3 * artworkScale }}>
              <Text
                style={[
                  styles.metricLabel,
                  {
                    fontSize: 11 * artworkScale,
                    lineHeight: 14 * artworkScale,
                  },
                ]}
              >
                Overall
              </Text>
              <View style={[styles.overallRow, { gap: 8 * artworkScale }]}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.overallValue,
                    {
                      fontSize: 30 * artworkScale,
                      lineHeight: 34 * artworkScale,
                    },
                  ]}
                >
                  {formatRating(overall)}
                </Text>
                <View
                  style={[
                    styles.pipsWell,
                    {
                      paddingHorizontal: 8 * artworkScale,
                      paddingVertical: 4 * artworkScale,
                      borderRadius: 10 * artworkScale,
                    },
                  ]}
                >
                  <RatingPips
                    value={overall ?? 0}
                    size={13 * artworkScale}
                    accessibilityLabel=""
                  />
                </View>
              </View>
            </View>
            <Text
              numberOfLines={1}
              style={[
                styles.breakdown,
                {
                  fontSize: 12 * artworkScale,
                  lineHeight: 16 * artworkScale,
                },
              ]}
            >
              Taste {formatRating(review.taste)} · Presentation{" "}
              {formatRating(review.presentation)}
            </Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  photo: {
    position: "absolute",
  },
  tagRow: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  tag: {
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  tagText: {
    fontFamily: fonts.bold,
    letterSpacing: 0,
  },
  logo: {
    position: "absolute",
    overflow: "hidden",
  },
  content: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  usernameRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  username: {
    color: CARD.paper,
    fontFamily: fonts.bold,
    letterSpacing: 0,
    opacity: 0.94,
    flexShrink: 1,
  },
  headline: {
    color: CARD.paper,
    fontFamily: fonts.black,
    letterSpacing: 0,
  },
  shareHeadlineRow: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 0,
  },
  shareHeadline: {
    // Shrink, don't flex: a flexed headline spans the row and shoves the
    // verified mark to the card's edge instead of keeping it by the name.
    flexShrink: 1,
    minWidth: 0,
  },
  meta: {
    color: CARD.paper,
    fontFamily: fonts.mono,
    letterSpacing: 0,
    opacity: 0.9,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  metricLabel: {
    ...typography.label,
    color: CARD.paper,
    textTransform: "uppercase",
    opacity: 0.92,
  },
  overallRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  overallValue: {
    color: CARD.paper,
    fontFamily: fonts.black,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0,
  },
  // The app's sunken pips well, translated to the card's ink scrim.
  pipsWell: {
    backgroundColor: "rgba(250,249,246,0.16)",
  },
  breakdown: {
    color: CARD.paper,
    fontFamily: fonts.regular,
    letterSpacing: 0,
    opacity: 0.9,
    textAlign: "right",
  },
});

export default ReviewShareCard;
