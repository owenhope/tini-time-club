import * as ImageManipulator from "expo-image-manipulator";

// Review photos are delivered directly from Storage, so the upload itself is
// the canonical delivery variant. Keeping this at the largest screen size
// avoids a runtime Storage image transformation for every new photo.
export const MAX_REVIEW_IMAGE_EDGE = 1080;
export const REVIEW_IMAGE_COMPRESSION = 0.7;

export const REVIEW_IMAGE_UPLOAD_OPTIONS = {
  cacheControl: "31536000",
  contentType: "image/jpeg",
  upsert: false,
} as const;

export interface ReviewImageSource {
  uri: string;
  width?: number;
  height?: number;
}

export const getReviewImageResizeActions = ({
  width,
  height,
}: Pick<ReviewImageSource, "width" | "height">) => {
  if (
    !width ||
    !height ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    Math.max(width, height) <= MAX_REVIEW_IMAGE_EDGE
  ) {
    return [];
  }

  return width >= height
    ? [{ resize: { width: MAX_REVIEW_IMAGE_EDGE } }]
    : [{ resize: { height: MAX_REVIEW_IMAGE_EDGE } }];
};

export const prepareReviewImageForUpload = (source: ReviewImageSource) =>
  ImageManipulator.manipulateAsync(
    source.uri,
    getReviewImageResizeActions(source),
    {
      compress: REVIEW_IMAGE_COMPRESSION,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
