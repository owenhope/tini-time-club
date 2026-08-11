import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Image as ExpoImage } from "expo-image";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { OLIVE_ICON_COLOR, RatingPips } from "@/components/shared";
import type { Review } from "@/types/types";
import { fonts } from "@/theme";
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
  onImageError?: () => void;
}

const CARD = {
  ink: "#10241B",
  inkRaised: "#183328",
  paper: "#FAF9F6",
  sage: "#8EC4AC",
  purple: "#B6A3E2",
  purpleDeep: "#6B53A8",
  purplePale: "#EDE7F8",
  chartreuse: "#F2FF71",
  border: "rgba(250,249,246,0.22)",
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
  const panelHeight = height * (format === "story" ? 0.4 : 0.54);
  const photoFrameHeight = height - panelHeight;
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
  const cityCountry = review.location?.address
    ? formatCityRegion(
        stripNameFromAddress(review.location.name, review.location.address)
      )
    : "";
  const overall = calculateOverallRating(review.taste, review.presentation);
  const spiritColors = getReviewTagColors(review.spirit?.name);
  const typeColors = getReviewTagColors(review.type?.name);
  const chipFontSize = 12 * artworkScale;
  const ratingPipSize = 14 * artworkScale;

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
            }}
            onError={onImageError}
          />
        </Animated.View>

        <View
          pointerEvents="none"
          style={[
            styles.photoShade,
            { height: Math.max(panelHeight * 0.5, 110 * artworkScale) },
          ]}
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
            styles.photoLogo,
            {
              top: 0,
              left: 0,
              width: 78 * artworkScale,
              height: 78 * artworkScale,
              borderBottomRightRadius: 11 * artworkScale,
            },
          ]}
        >
          <ExpoImage
            source={require("@/assets/images/icon-purple.png")}
            style={{ width: 78 * artworkScale, height: 78 * artworkScale }}
            contentFit="cover"
          />
        </View>

        <View
          pointerEvents="none"
          style={[
            styles.panel,
            {
              height: panelHeight,
              padding: panelPadding,
              gap: 6 * artworkScale,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.username,
              {
                fontSize: 12 * artworkScale,
                lineHeight: 15 * artworkScale,
              },
            ]}
          >
            @{review.profile?.username || "tinitimeclub"}
          </Text>
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            style={[
              styles.venue,
              {
                fontSize: 28 * artworkScale,
                lineHeight: 31 * artworkScale,
              },
            ]}
          >
            {review.location?.name || "Martini review"}
          </Text>
          {cityCountry ? (
            <Text
              numberOfLines={1}
              style={[
                styles.city,
                {
                  fontSize: 12 * artworkScale,
                  lineHeight: 16 * artworkScale,
                },
              ]}
            >
              {cityCountry}
            </Text>
          ) : null}

          <View
            style={[
              styles.divider,
              {
                marginTop: 3 * artworkScale,
                marginBottom: 3 * artworkScale,
              },
            ]}
          />

          <View style={[styles.ratings, { gap: 10 * artworkScale }]}>
            <View style={[styles.ratingAxes, { gap: 12 * artworkScale }]}>
              <ShareRatingAxis
                label="Taste"
                value={review.taste}
                pipSize={ratingPipSize}
                scale={artworkScale}
              />
              <ShareRatingAxis
                label="Presentation"
                value={review.presentation}
                pipSize={ratingPipSize}
                scale={artworkScale}
              />
            </View>
            <View style={[styles.overall, { width: 74 * artworkScale }]}>
              <Text
                style={[
                  styles.ratingLabel,
                  {
                    fontSize: 9 * artworkScale,
                    lineHeight: 12 * artworkScale,
                  },
                ]}
              >
                OVERALL
              </Text>
              <Text
                style={[
                  styles.overallValue,
                  {
                    fontSize: 38 * artworkScale,
                    lineHeight: 39 * artworkScale,
                  },
                ]}
              >
                {formatRating(overall)}
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.shareMessage,
              {
                marginHorizontal: -panelPadding,
                marginBottom: -panelPadding,
                paddingHorizontal: panelPadding,
                paddingVertical: 9 * artworkScale,
              },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[
                styles.shareMessageText,
                {
                  fontSize: 13 * artworkScale,
                  lineHeight: 16 * artworkScale,
                },
              ]}
            >
              Join the Club{" "}
              <Text style={styles.shareMessageJoin}>@tinitimeclub</Text>
            </Text>
          </View>
        </View>
      </Animated.View>
    </GestureDetector>
  );
};

const ShareRatingAxis = ({
  label,
  value,
  pipSize,
  scale,
}: {
  label: string;
  value: number;
  pipSize: number;
  scale: number;
}) => (
  <View
    style={[
      styles.axis,
      {
        paddingHorizontal: 7 * scale,
        paddingVertical: 7 * scale,
        borderRadius: 10 * scale,
      },
    ]}
  >
    <Text
      numberOfLines={1}
      style={[
        styles.ratingLabel,
        {
          marginBottom: 6 * scale,
          fontSize: 9 * scale,
          lineHeight: 12 * scale,
        },
      ]}
    >
      {label.toUpperCase()}
    </Text>
    <RatingPips
      value={value}
      size={pipSize}
      bodyColor={OLIVE_ICON_COLOR}
      emptyColor={OLIVE_ICON_COLOR}
      style={[styles.sharePips, { gap: 4.5 * scale }]}
      accessibilityLabel=""
    />
  </View>
);

const styles = StyleSheet.create({
  photo: {
    position: "absolute",
  },
  photoShade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(16,36,27,0.28)",
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
  photoLogo: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "rgba(250,249,246,0.48)",
    backgroundColor: CARD.purple,
  },
  panel: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: CARD.purpleDeep,
  },
  username: {
    color: CARD.chartreuse,
    fontFamily: fonts.bold,
    letterSpacing: 0,
  },
  venue: {
    color: CARD.paper,
    fontFamily: fonts.black,
    letterSpacing: 0,
  },
  city: {
    color: CARD.purplePale,
    fontFamily: fonts.mono,
    letterSpacing: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: CARD.border,
  },
  ratings: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ratingAxes: {
    flex: 1,
    flexDirection: "row",
  },
  axis: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
    backgroundColor: "rgba(250,249,246,0.10)",
  },
  ratingLabel: {
    color: CARD.purplePale,
    fontFamily: fonts.bold,
    letterSpacing: 0,
  },
  sharePips: {
    alignSelf: "flex-start",
  },
  overall: {
    alignItems: "flex-end",
  },
  overallValue: {
    color: CARD.paper,
    fontFamily: fonts.black,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0,
  },
  shareMessage: {
    marginTop: "auto",
    alignItems: "center",
    backgroundColor: CARD.chartreuse,
  },
  shareMessageText: {
    color: CARD.ink,
    fontFamily: fonts.semibold,
    letterSpacing: 0,
    textAlign: "center",
  },
  shareMessageJoin: {
    color: CARD.ink,
    fontFamily: fonts.black,
    letterSpacing: 0,
  },
});

export default ReviewShareCard;
