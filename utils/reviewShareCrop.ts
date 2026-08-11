export interface CropSize {
  width: number;
  height: number;
}

export interface CropOverflow {
  x: number;
  y: number;
}

export const MIN_REVIEW_SHARE_PHOTO_SCALE = 1;
export const MAX_REVIEW_SHARE_PHOTO_SCALE = 3;

export const getCoverSize = (
  imageAspect: number,
  frameWidth: number,
  frameHeight: number
): CropSize => {
  const frameAspect = frameWidth / frameHeight;

  return imageAspect > frameAspect
    ? { width: frameHeight * imageAspect, height: frameHeight }
    : { width: frameWidth, height: frameWidth / imageAspect };
};

export const getCropOverflow = (
  imageSize: CropSize,
  frameSize: CropSize,
  scale: number
): CropOverflow => ({
  x: Math.max(0, (imageSize.width * scale - frameSize.width) / 2),
  y: Math.max(0, (imageSize.height * scale - frameSize.height) / 2),
});

/** Preserve the approved full-canvas crop while allowing users to zoom out. */
export const getDefaultPhotoScale = (
  imageAspect: number,
  cardSize: CropSize,
  photoFrameSize: CropSize
): number => {
  const legacySize = getCoverSize(imageAspect, cardSize.width, cardSize.height);
  const baseSize = getCoverSize(
    imageAspect,
    photoFrameSize.width,
    photoFrameSize.height
  );

  return Math.min(
    MAX_REVIEW_SHARE_PHOTO_SCALE,
    Math.max(
      MIN_REVIEW_SHARE_PHOTO_SCALE,
      legacySize.width / baseSize.width,
      legacySize.height / baseSize.height
    )
  );
};
