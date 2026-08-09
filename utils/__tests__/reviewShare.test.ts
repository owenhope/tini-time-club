import { logReviewShare, reviewShareText } from "../reviewShare";
import { supabase } from "@/utils/supabase";

jest.mock("react-native", () => ({
  Alert: {},
  Linking: {},
  Platform: { OS: "ios" },
  Share: {},
}));

jest.mock("@/utils/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));

describe("review share text", () => {
  it("uses only the reviewer's name and club name", () => {
    expect(
      reviewShareText({
        profile: { username: "Owen" },
        location: { name: "Dovetail" },
        taste: 4.5,
        presentation: 5,
      } as any)
    ).toBe("Check out Owen's review on Tini Time Club.");
  });

  it("has a neutral fallback when the reviewer name is unavailable", () => {
    expect(reviewShareText({ profile: null } as any)).toBe(
      "Check out this review on Tini Time Club."
    );
  });

  it("logs the selected Instagram format through the private RPC", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({ error: null });

    await logReviewShare(42, "instagram_story", "previewed");

    expect(supabase.rpc).toHaveBeenCalledWith("log_review_share", {
      p_review_id: 42,
      p_channel: "instagram_story",
      p_outcome: "previewed",
    });
  });
});
