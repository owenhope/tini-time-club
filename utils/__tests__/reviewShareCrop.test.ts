import {
  getCoverSize,
  getCropOverflow,
  getDefaultPhotoScale,
} from "@/utils/reviewShareCrop";

describe("review share crop", () => {
  const card = { width: 360, height: 640 };
  const photoFrame = { width: 360, height: 384 };
  const landscapeAspect = 4 / 3;

  it("allows both horizontal and vertical panning at the initial crop", () => {
    const baseSize = getCoverSize(
      landscapeAspect,
      photoFrame.width,
      photoFrame.height
    );
    const initialScale = getDefaultPhotoScale(
      landscapeAspect,
      card,
      photoFrame
    );
    const overflow = getCropOverflow(baseSize, photoFrame, initialScale);

    expect(overflow.x).toBeGreaterThan(0);
    expect(overflow.y).toBeGreaterThan(0);
  });

  it("reveals the maximum photo without exposing the canvas at minimum zoom", () => {
    const baseSize = getCoverSize(
      landscapeAspect,
      photoFrame.width,
      photoFrame.height
    );
    const overflow = getCropOverflow(baseSize, photoFrame, 1);

    expect(overflow.x).toBeGreaterThan(0);
    expect(overflow.y).toBe(0);
    expect(baseSize.height).toBe(photoFrame.height);
  });
});
