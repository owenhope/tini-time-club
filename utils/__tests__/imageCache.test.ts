const mockCreateSignedUrls = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiRemove: jest.fn(),
  multiSet: jest.fn().mockResolvedValue(undefined),
  setItem: jest.fn(),
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    storage: {
      from: () => ({ createSignedUrls: mockCreateSignedUrls }),
    },
  },
}));

jest.mock("@/utils/log", () => ({
  reportError: jest.fn(),
}));

import imageCache from "@/utils/imageCache";

describe("review image delivery", () => {
  beforeEach(() => {
    mockCreateSignedUrls.mockReset();
  });

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
