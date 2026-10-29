import {
  checkForAppStoreUpdate,
  checkMinimumSupportedVersion,
  compareAppVersions,
  resetAppVersionCheckForTests,
} from "@/services/appVersionService";

jest.mock("@/utils/supabase", () => ({ supabase: { rpc: jest.fn() } }));

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

  it.each(["4.1.0", "4.0.2"])("does not report version %s", async (version) => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            resultCount: 1,
            results: [{ version, trackViewUrl: "https://example.com" }],
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
    await checkForAppStoreUpdate({
      ...runtime,
      now: 1_000_000_000 + 12 * 60 * 60 * 1000,
      fetchImpl,
    });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it.each(["offline", "server"])(
    "retries a %s failure after five minutes",
    async (failure) => {
      const fetchImpl = jest
        .fn<ReturnType<typeof fetch>, Parameters<typeof fetch>>()
        .mockResolvedValue(new Response(JSON.stringify({ results: [] })));
      if (failure === "offline")
        fetchImpl.mockRejectedValueOnce(new Error("offline"));
      else fetchImpl.mockResolvedValueOnce(new Response(null, { status: 503 }));
      await checkForAppStoreUpdate({ ...runtime, now: 0, fetchImpl });
      await checkForAppStoreUpdate({ ...runtime, now: 1, fetchImpl });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      await checkForAppStoreUpdate({ ...runtime, now: 300_000, fetchImpl });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }
  );

  it("retains a discovered update for deferred foreground presentation", async () => {
    const fetchImpl = jest.fn(
      async () =>
        new Response(
          JSON.stringify({
            results: [
              {
                version: "4.2.0",
                trackViewUrl: "https://apps.apple.com/app/id123",
              },
            ],
          })
        )
    );
    const update = await checkForAppStoreUpdate({
      ...runtime,
      now: 0,
      fetchImpl,
    });
    expect(update?.latestVersion).toBe("4.2.0");
    expect(
      await checkForAppStoreUpdate({ ...runtime, now: 1, fetchImpl })
    ).toEqual(update);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  describe("minimum supported version", () => {
    const policy = (data: unknown, error: unknown = null) =>
      jest.fn(async () => ({ data, error }));
    const storeUrl = "https://apps.apple.com/app/id6741620393";

    it("requires an update below the server's minimum", async () => {
      const rpc = policy({ minSupportedVersion: "4.9.2", storeUrl });
      await expect(
        checkMinimumSupportedVersion({
          platform: "ios",
          installedVersion: "4.9.1",
          rpc,
        })
      ).resolves.toEqual({
        installedVersion: "4.9.1",
        minSupportedVersion: "4.9.2",
        storeUrl,
      });
      expect(rpc).toHaveBeenCalledWith("ios");
    });

    it("lets a build at or above the minimum through", async () => {
      for (const installedVersion of ["4.9.2", "4.10.0"]) {
        await expect(
          checkMinimumSupportedVersion({
            platform: "android",
            installedVersion,
            rpc: policy({ minSupportedVersion: "4.9.2", storeUrl }),
          })
        ).resolves.toBeNull();
      }
    });

    it.each([
      ["a server error", policy(null, new Error("down"))],
      ["no policy row", policy(null)],
      ["a malformed policy", policy({ minSupportedVersion: 5, storeUrl })],
      [
        "a non-https store link",
        policy({ minSupportedVersion: "9.0.0", storeUrl: "http://x" }),
      ],
      [
        "a thrown request",
        jest.fn(async () => {
          throw new Error("offline");
        }),
      ],
    ])("fails open on %s", async (_label, rpc) => {
      await expect(
        checkMinimumSupportedVersion({
          platform: "ios",
          installedVersion: "4.0.0",
          rpc,
        })
      ).resolves.toBeNull();
    });

    it("never gates platforms without a store", async () => {
      const rpc = policy({ minSupportedVersion: "9.0.0", storeUrl });
      await expect(
        checkMinimumSupportedVersion({
          platform: "web",
          installedVersion: "1.0.0",
          rpc,
        })
      ).resolves.toBeNull();
      expect(rpc).not.toHaveBeenCalled();
    });
  });
});
