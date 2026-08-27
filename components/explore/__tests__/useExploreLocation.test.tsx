import React from "react";
import renderer, { act } from "react-test-renderer";
import * as Location from "expo-location";
import { useExploreLocation } from "@/components/explore/useExploreLocation";

jest.mock("expo-device", () => ({ isDevice: true }));
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
});
