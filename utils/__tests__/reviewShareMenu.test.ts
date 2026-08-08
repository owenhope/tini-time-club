import { getReviewShareMenuActions } from "@/utils/reviewShareMenu";

describe("getReviewShareMenuActions", () => {
  it("offers both image formats and a link for a review with a photo", () => {
    expect(getReviewShareMenuActions(true)).toEqual([
      { label: "Instagram Story", format: "story" },
      { label: "Instagram Post", format: "post" },
      { label: "Share Link", link: true },
    ]);
  });

  it("keeps reviews without a photo link-only", () => {
    expect(getReviewShareMenuActions(false)).toEqual([
      { label: "Share Link", link: true },
    ]);
  });
});
