import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { useExploreRegion } from "../useExploreRegion";
import type { ExploreLocationState } from "@/components/explore/useExploreLocation";

jest.mock("@/services/regionService", () => ({
  getEnabledRegions: jest.fn(async () => []),
  getSavedRegionId: jest.fn(async () => null),
  findRegionForCoordinates: jest.fn(() => null),
  saveRegion: jest.fn(async () => undefined),
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));

const location = {
  status: "idle",
  coordinates: null,
  canOpenSettings: false,
} as unknown as ExploreLocationState;
const requestLocation = jest.fn(async () => undefined);

function Harness({ canRequest }: { canRequest: boolean }) {
  useExploreRegion(location, requestLocation, canRequest);
  return null;
}

let renderer: ReactTestRenderer | undefined;
afterEach(() => {
  act(() => renderer?.unmount());
  requestLocation.mockClear();
});

it("holds the location prompt until Explore has been opened", async () => {
  await act(async () => {
    renderer = create(<Harness canRequest={false} />);
  });
  expect(requestLocation).not.toHaveBeenCalled();

  await act(async () => {
    renderer!.update(<Harness canRequest />);
  });
  expect(requestLocation).toHaveBeenCalledTimes(1);
  expect(requestLocation).toHaveBeenCalledWith();
});
