import { locationShareText, publicLocationUrl } from "../locationShare";

jest.mock("react-native", () => ({
  Platform: { OS: "ios" },
  Share: {},
}));

jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

describe("location sharing", () => {
  it("uses the location name in the share copy", () => {
    expect(locationShareText({ id: 42, name: "Dovetail" })).toBe(
      "Check out Dovetail on Tini Time Club."
    );
  });

  it("builds the public location preview URL", () => {
    expect(publicLocationUrl("42")).toBe("https://tinitimeclub.com/p/42");
  });
});
