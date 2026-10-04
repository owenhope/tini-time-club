import React from "react";
import renderer, { act } from "react-test-renderer";
import {
  getDiscoverLocationsPage,
  getDiscoverProfilesPage,
  type DiscoveryPage,
  type DiscoveredLocation,
  type DiscoveredProfile,
} from "@/services/discoveryService";
import { useExploreDiscovery } from "@/hooks/useExploreDiscovery";

jest.mock("@/services/discoveryService", () => ({
  getDiscoverLocationsPage: jest.fn(),
  getDiscoverProfilesPage: jest.fn(),
}));

jest.mock("@/utils/log", () => ({
  reportError: jest.fn(),
}));

const profilesPage: DiscoveryPage<DiscoveredProfile> = {
  items: [],
  nextCursor: null,
  hasMore: false,
};

const locationsPage: DiscoveryPage<DiscoveredLocation> = {
  items: [],
  nextCursor: null,
  hasMore: false,
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

describe("useExploreDiscovery loading state", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(getDiscoverProfilesPage).mockReset();
    jest.mocked(getDiscoverLocationsPage).mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each(["profiles", "locations"] as const)(
    "does not fetch %s when a hidden list reaches its end",
    async (activeView) => {
      jest.mocked(getDiscoverProfilesPage).mockResolvedValue(profilesPage);
      jest.mocked(getDiscoverLocationsPage).mockResolvedValue(locationsPage);
      let latest: ReturnType<typeof useExploreDiscovery> | undefined;
      const Harness = () => {
        latest = useExploreDiscovery({
          enabled: false,
          activeView,
          query: "",
          location: {
            status: "idle",
            coordinates: null,
            canOpenSettings: false,
          },
          requestLocation: async () => undefined,
        });
        return null;
      };
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(<Harness />);
      });
      await act(async () => {
        jest.runOnlyPendingTimers();
        latest!.handleEndReached();
      });
      expect(getDiscoverProfilesPage).not.toHaveBeenCalled();
      expect(getDiscoverLocationsPage).not.toHaveBeenCalled();
      act(() => tree!.unmount());
    }
  );

  it("keeps the active view loading when an older view request resolves", async () => {
    const profilesRequest = deferred<DiscoveryPage<DiscoveredProfile>>();
    const locationsRequest = deferred<DiscoveryPage<DiscoveredLocation>>();
    jest
      .mocked(getDiscoverProfilesPage)
      .mockReturnValue(profilesRequest.promise);
    jest
      .mocked(getDiscoverLocationsPage)
      .mockReturnValue(locationsRequest.promise);

    let activeView: "profiles" | "locations" = "profiles";
    let latest: ReturnType<typeof useExploreDiscovery> | undefined;
    const requestLocation = jest.fn(async () => undefined);
    const location = {
      status: "ready" as const,
      coordinates: { latitude: 49.28, longitude: -123.12 },
      canOpenSettings: false as const,
    };
    const Harness = () => {
      latest = useExploreDiscovery({
        enabled: true,
        activeView,
        query: "",
        location,
        requestLocation,
      });
      return null;
    };

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Harness />);
    });
    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(getDiscoverProfilesPage).toHaveBeenCalledTimes(1);

    activeView = "locations";
    act(() => {
      tree!.update(<Harness />);
    });
    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });
    expect(latest?.loading).toBe(true);

    await act(async () => {
      profilesRequest.resolve(profilesPage);
      await profilesRequest.promise;
    });
    expect(latest?.loading).toBe(true);

    await act(async () => {
      locationsRequest.resolve(locationsPage);
      await locationsRequest.promise;
    });
    expect(latest?.loading).toBe(false);

    act(() => tree!.unmount());
  });

  it("keeps paging members after a search replaces an in-flight page", async () => {
    const profile = (id: string) => ({ id, username: id }) as DiscoveredProfile;
    const cursor = { value: 1, id: "c" } as never;
    const staleAppend = deferred<DiscoveryPage<DiscoveredProfile>>();
    jest
      .mocked(getDiscoverProfilesPage)
      .mockResolvedValueOnce({
        items: [profile("a")],
        nextCursor: cursor,
        hasMore: true,
      })
      .mockReturnValueOnce(staleAppend.promise)
      .mockResolvedValueOnce({
        items: [profile("olive")],
        nextCursor: cursor,
        hasMore: true,
      })
      .mockResolvedValueOnce({
        items: [profile("olive-2")],
        nextCursor: null,
        hasMore: false,
      });

    let query = "";
    let latest: ReturnType<typeof useExploreDiscovery> | undefined;
    const Harness = () => {
      latest = useExploreDiscovery({
        enabled: true,
        activeView: "profiles",
        query,
        location: { status: "idle", coordinates: null, canOpenSettings: false },
        requestLocation: jest.fn(async () => undefined),
      });
      return null;
    };

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Harness />);
    });
    await act(async () => {
      jest.advanceTimersByTime(1);
      await Promise.resolve();
    });

    // Reach the end: page 2 starts loading and is still in flight...
    act(() => latest!.handleEndReached());
    expect(getDiscoverProfilesPage).toHaveBeenCalledTimes(2);

    // ...when the member searches, replacing the list.
    query = "olive";
    act(() => tree!.update(<Harness />));
    await act(async () => {
      jest.advanceTimersByTime(300);
      await Promise.resolve();
    });

    // The abandoned page must not leak into the new results.
    await act(async () => {
      staleAppend.resolve({
        items: [profile("stale")],
        nextCursor: null,
        hasMore: false,
      });
      await staleAppend.promise;
    });
    expect(latest?.profiles.map((item) => item.id)).toEqual(["olive"]);

    // And paging still works for the new results.
    await act(async () => {
      latest!.handleEndReached();
      await Promise.resolve();
    });
    expect(getDiscoverProfilesPage).toHaveBeenCalledTimes(4);
    expect(latest?.profiles.map((item) => item.id)).toEqual([
      "olive",
      "olive-2",
    ]);

    act(() => tree!.unmount());
  });
});
