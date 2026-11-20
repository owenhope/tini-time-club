import { appVersionLabel } from "@/utils/appVersionLabel";

jest.mock("expo-updates", () => ({ isEmbeddedLaunch: true, updateId: null }));

describe("appVersionLabel", () => {
  it("shows the store version for the build's own bundle", () => {
    expect(
      appVersionLabel("5.0.0", { isEmbeddedLaunch: true, updateId: "abc" })
    ).toBe("Version 5.0.0");
  });

  it("adds the short update id when an OTA update is running", () => {
    expect(
      appVersionLabel("5.0.0", {
        isEmbeddedLaunch: false,
        updateId: "0193f2c4-1111-2222-3333-444455556666",
      })
    ).toBe("Version 5.0.0 · update 0193f2c4");
  });
});
