import { reviewShareText } from "../reviewShare";

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
});
