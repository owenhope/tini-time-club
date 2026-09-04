const mockCreateSignedUrls = jest.fn();
const mockCreateSignedUrl = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getAllKeys: jest.fn().mockResolvedValue([]),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
  multiSet: jest.fn().mockResolvedValue(undefined),
  setItem: jest.fn(),
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    storage: {
      from: () => ({
        createSignedUrls: mockCreateSignedUrls,
        createSignedUrl: mockCreateSignedUrl,
      }),
    },
  },
}));

jest.mock("@/utils/log", () => ({
  reportError: jest.fn(),
}));

import imageCache from "@/utils/imageCache";

describe("review image delivery", () => {
  it.each(["single", "batch"])(
    "retries %s signing after a transient failure",
    async (mode) => {
      const sign =
        mode === "single" ? mockCreateSignedUrl : mockCreateSignedUrls;
      sign
        .mockResolvedValueOnce(
          mode === "single"
            ? {
                data: null,
                error: { message: "Service unavailable", status: 503 },
              }
            : {
                data: [{ path: "retry.jpg", error: "Service unavailable" }],
                error: null,
              }
        )
        .mockResolvedValue({
          data:
            mode === "single"
              ? { signedUrl: "recovered" }
              : [{ path: "retry.jpg", signedUrl: "recovered" }],
          error: null,
        });
      const read = () =>
        mode === "single"
          ? imageCache.getReviewImageUrl("retry.jpg")
          : imageCache.getReviewImageUrls(["retry.jpg"]);
      await read();
      expect(await read()).toEqual(
        mode === "single" ? "recovered" : { "retry.jpg": "recovered" }
      );
    }
  );
  beforeEach(async () => {
    mockCreateSignedUrls.mockReset();
    mockCreateSignedUrl.mockReset();
    await imageCache.clearCache();
  });

  it.each(["single", "batch"])(
    "does not reuse %s signing results after clearing the cache",
    async (mode) => {
      let release!: (value: unknown) => void;
      const sign =
        mode === "single" ? mockCreateSignedUrl : mockCreateSignedUrls;
      const result = (url: string) => ({
        data:
          mode === "single"
            ? { signedUrl: url }
            : [{ path: "photo.jpg", signedUrl: url }],
        error: null,
      });
      sign
        .mockImplementationOnce(
          () =>
            new Promise((resolve) => {
              release = resolve;
            })
        )
        .mockResolvedValue(result("fresh"));
      const read = () =>
        mode === "single"
          ? imageCache.getReviewImageUrl("photo.jpg")
          : imageCache.getReviewImageUrls(["photo.jpg"]);
      const oldRead = read();
      await imageCache.clearCache();
      release(result("stale"));
      await oldRead;
      expect(await read()).toEqual(
        mode === "single" ? "fresh" : { "photo.jpg": "fresh" }
      );
      expect(sign).toHaveBeenCalledTimes(2);
    }
  );

  it("returns the signed object URL without a runtime transform", async () => {
    const path = `direct-delivery-${Date.now()}.jpg`;
    const signedUrl =
      "https://example.supabase.co/storage/v1/object/sign/review_images/direct.jpg?token=test";
    mockCreateSignedUrls.mockResolvedValue({
      data: [{ path, signedUrl }],
      error: null,
    });

    const result = await imageCache.getReviewImageUrls([path]);

    expect(result[path]).toBe(signedUrl);
    expect(result[path]).not.toContain("/render/image/");
    expect(result[path]).not.toContain("width=");
  });
});
