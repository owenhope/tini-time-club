import { getReviewShareMenuActions } from "@/utils/reviewShareMenu";

describe("getReviewShareMenuActions", () => {
  it("offers the approved review share destinations", () => {
    expect(getReviewShareMenuActions()).toEqual([
      {
        label: "Instagram Story",
        destination: "instagram_story",
        format: "story",
      },
      {
        label: "Instagram Post",
        destination: "instagram_post",
        format: "post",
      },
      { label: "WhatsApp", destination: "whatsapp" },
      { label: "Message", destination: "message" },
      { label: "Copy Link", destination: "copy_link" },
    ]);
  });
});
