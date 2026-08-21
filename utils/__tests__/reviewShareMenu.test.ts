import { getReviewShareMenuActions } from "@/utils/reviewShareMenu";

describe("getReviewShareMenuActions", () => {
  it("offers the approved review share destinations", () => {
    expect(getReviewShareMenuActions()).toEqual([
      {
        label: "Instagram Story",
        destination: "instagram_story",
      },
      { label: "WhatsApp", destination: "whatsapp" },
      { label: "Message", destination: "message" },
      { label: "Copy Link", destination: "copy_link" },
    ]);
  });
});
