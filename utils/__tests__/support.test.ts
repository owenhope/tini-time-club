import { openSupport, SUPPORT_EMAIL } from "@/utils/support";
import { LEGAL_URLS } from "@/utils/legalUrls";

jest.mock("@/utils/log", () => ({ warn: jest.fn() }));

describe("openSupport", () => {
  it("opens an email to support when mail is available", async () => {
    const openURL = jest.fn().mockResolvedValue(true);
    await expect(openSupport({ openURL })).resolves.toBe("email");
    expect(openURL).toHaveBeenCalledTimes(1);
    expect(openURL.mock.calls[0][0]).toMatch(
      `mailto:${SUPPORT_EMAIL}?subject=`
    );
  });

  it("falls back to the support page when mail can't open", async () => {
    const openURL = jest
      .fn()
      .mockRejectedValueOnce(new Error("Unable to open URL"))
      .mockResolvedValue(true);
    await expect(openSupport({ openURL })).resolves.toBe("web");
    expect(openURL).toHaveBeenLastCalledWith(LEGAL_URLS.support);
  });
});
