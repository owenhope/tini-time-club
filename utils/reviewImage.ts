import * as ImageManipulator from "expo-image-manipulator";

// Every screen reads review photos through the storage transform at 1080px
// (see utils/imageCache.ts), so the stored original only needs enough
// headroom over that to stay the master copy. 1440px halves the pixel count
// of the old 2048px cap — faster uploads, cheaper storage and transforms —
// without the serving path ever noticing.
export const MAX_REVIEW_IMAGE_EDGE = 1440;
export const REVIEW_IMAGE_COMPRESSION = 0.7;

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
