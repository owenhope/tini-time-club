const mockManipulateAsync = jest.fn();

jest.mock("expo-image-manipulator", () => ({
  manipulateAsync: (...args: unknown[]) => mockManipulateAsync(...args),
  SaveFormat: { JPEG: "jpeg" },
}));

import {
  getReviewImageResizeActions,
  MAX_REVIEW_IMAGE_EDGE,
  prepareReviewImageForUpload,
  REVIEW_IMAGE_COMPRESSION,
  REVIEW_IMAGE_UPLOAD_OPTIONS,
} from "@/utils/reviewImage";

describe("review image preparation", () => {
  beforeEach(() => {
    mockManipulateAsync.mockReset();
    mockManipulateAsync.mockResolvedValue({
      uri: "file:///prepared.jpg",
      width: MAX_REVIEW_IMAGE_EDGE,
      height: 1365,
    });
  });

  it("uses the canonical delivery size and immutable upload cache policy", () => {
    expect(MAX_REVIEW_IMAGE_EDGE).toBe(1080);
    expect(REVIEW_IMAGE_UPLOAD_OPTIONS).toEqual({
      cacheControl: "31536000",
      contentType: "image/jpeg",
      upsert: false,
    });
  });

  it("limits a landscape image by width", () => {
    expect(getReviewImageResizeActions({ width: 4032, height: 3024 })).toEqual([
      { resize: { width: MAX_REVIEW_IMAGE_EDGE } },
    ]);
  });

  it("limits a portrait image by height", () => {
    expect(getReviewImageResizeActions({ width: 3024, height: 4032 })).toEqual([
      { resize: { height: MAX_REVIEW_IMAGE_EDGE } },
    ]);
  });

  it("does not upscale an image already inside the limit", () => {
    expect(getReviewImageResizeActions({ width: 1000, height: 900 })).toEqual(
      []
    );
  });

  it("resizes and compresses before returning the upload file", async () => {
    await prepareReviewImageForUpload({
      uri: "file:///camera.jpg",
      width: 4032,
      height: 3024,
    });

    expect(mockManipulateAsync).toHaveBeenCalledWith(
      "file:///camera.jpg",
      [{ resize: { width: MAX_REVIEW_IMAGE_EDGE } }],
      { compress: REVIEW_IMAGE_COMPRESSION, format: "jpeg" }
    );
  });
});
