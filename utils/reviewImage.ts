import * as ImageManipulator from "expo-image-manipulator";

export const MAX_REVIEW_IMAGE_EDGE = 2048;
export const REVIEW_IMAGE_COMPRESSION = 0.72;

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
