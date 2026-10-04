import React from "react";
import renderer, { act } from "react-test-renderer";
import * as Location from "expo-location";
import { useExploreLocation } from "@/components/explore/useExploreLocation";
import { useExploreRegion } from "@/hooks/useExploreRegion";
import { getEnabledRegions } from "@/services/regionService";

jest.mock("expo-device", () => ({ isDevice: true }));
jest.mock("@/services/regionService", () => ({
  getEnabledRegions: jest.fn(async () => []),
  getSavedRegionId: jest.fn(async () => null),
  saveRegion: jest.fn(async () => undefined),
  findRegionForCoordinates: jest.fn(() => null),
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));
jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const requestForegroundPermissions = jest.mocked(
  Location.requestForegroundPermissionsAsync
);
const getCurrentPosition = jest.mocked(Location.getCurrentPositionAsync);

describe("useExploreLocation", () => {
  beforeEach(() => {
    requestForegroundPermissions.mockReset();
    getCurrentPosition.mockReset();
  });

  it("retries the permission request after a denial when forced", async () => {
    requestForegroundPermissions
      .mockResolvedValueOnce({
        status: "denied" as Location.PermissionStatus,
        canAskAgain: true,
        granted: false,
        expires: "never",
      })
      .mockResolvedValueOnce({
        status: "granted" as Location.PermissionStatus,
        canAskAgain: true,
        granted: true,
        expires: "never",
      });
    getCurrentPosition.mockResolvedValueOnce({
      coords: { latitude: 49.28, longitude: -123.12 },
    } as Location.LocationObject);

    let latest: ReturnType<typeof useExploreLocation> | undefined;
    const Harness = () => {
      latest = useExploreLocation();
      return null;
    };

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Harness />);
    });

    await act(async () => {
      await latest!.request();
    });
    expect(latest?.state.status).toBe("denied");

    await act(async () => {
      await latest!.request(true);
    });

    expect(requestForegroundPermissions).toHaveBeenCalledTimes(2);
    expect(latest?.state).toMatchObject({
      status: "ready",
      coordinates: { latitude: 49.28, longitude: -123.12 },
    });
    act(() => tree!.unmount());
  });

  it("asks for location once when it is unavailable instead of looping", async () => {
    requestForegroundPermissions.mockResolvedValue({
      status: "granted" as Location.PermissionStatus,
      canAskAgain: true,
      granted: true,
      expires: "never",
    });
    // Location Services off / no fix: the position read throws.
    getCurrentPosition.mockRejectedValue(new Error("Location unavailable"));

    let latest: ReturnType<typeof useExploreRegion> | undefined;
    const Explore = () => {
      const { state, request } = useExploreLocation();
      latest = useExploreRegion(state, request);
      return null;
    };

    let tree: renderer.ReactTestRenderer;
    await act(async () => {
      tree = renderer.create(<Explore />);
    });
    for (let i = 0; i < 5; i += 1) {
      await act(async () => {
        await Promise.resolve();
      });
    }

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(jest.mocked(getEnabledRegions)).toHaveBeenCalledTimes(1);
    expect(latest?.state.locationStatus).toBe("unavailable");
    expect(latest?.state.status).toBe("needs-selection");
    act(() => tree!.unmount());
  });
});
