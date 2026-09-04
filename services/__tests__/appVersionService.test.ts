import {
  checkForAppStoreUpdate,
  compareAppVersions,
  resetAppVersionCheckForTests,
} from "@/services/appVersionService";

describe("appVersionService", () => {
  const runtime = {
    platform: "ios",
    installedVersion: "4.1.0",
    bundleIdentifier: "com.ohope.tinitimeclub",
    appEnvironment: "production",
  };

  beforeEach(() => {
    resetAppVersionCheckForTests();
  });

  it.each([
    ["4.1.0", "4.1.1", -1],
    ["4.1", "4.1.0", 0],
    ["4.10.0", "4.2.0", 1],
    ["4.1.0", "5.0.0", -1],
  ])("compares %s with %s", (left, right, expected) => {
    expect(compareAppVersions(left, right)).toBe(expected);
  });

  it("returns the newer App Store version", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            resultCount: 1,
            results: [
              {
                version: "4.2.0",
                trackViewUrl: "https://apps.apple.com/app/id123",
              },
            ],
          }),
          { status: 200 }
        )
    );

    await expect(
      checkForAppStoreUpdate({ ...runtime, fetchImpl })
    ).resolves.toEqual({
      installedVersion: "4.1.0",
      latestVersion: "4.2.0",
      storeUrl: "https://apps.apple.com/app/id123",
    });
  });

  it("does not report the installed or an older version", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            resultCount: 1,
            results: [
              { version: "4.1.0", trackViewUrl: "https://example.com" },
            ],
          }),
          { status: 200 }
        )
    );

    await expect(
      checkForAppStoreUpdate({ ...runtime, fetchImpl })
    ).resolves.toBeNull();
  });

  it("fails open when the lookup is unavailable", async () => {
    const fetchImpl = jest.fn(async () => {
      throw new Error("offline");
    });

    await expect(
      checkForAppStoreUpdate({ ...runtime, fetchImpl })
    ).resolves.toBeNull();
  });

  it("checks at most once per interval", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(JSON.stringify({ resultCount: 0, results: [] }), {
          status: 200,
        })
    );

    await checkForAppStoreUpdate({
      ...runtime,
      now: 1_000_000_000,
      fetchImpl,
    });
    await checkForAppStoreUpdate({
      ...runtime,
      now: 1_000_000_001,
      fetchImpl,
    });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
