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
});
