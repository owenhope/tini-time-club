import { toReviewImageDeliveryUrl } from "./imageDelivery";

describe("public review image delivery", () => {
  it("returns the signed object URL without a runtime transform", () => {
    const signedUrl =
      "https://example.supabase.co/storage/v1/object/sign/review_images/direct.jpg?token=test";

    expect(toReviewImageDeliveryUrl(signedUrl)).toBe(signedUrl);
  });
});
