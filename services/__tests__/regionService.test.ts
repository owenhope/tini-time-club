const mockRpc = jest.fn();
const mockGetItem = jest.fn();
const mockSetItem = jest.fn();
const mockRemoveItem = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: (...args: unknown[]) => mockGetItem(...args),
  setItem: (...args: unknown[]) => mockSetItem(...args),
  removeItem: (...args: unknown[]) => mockRemoveItem(...args),
}));

import {
  clearSavedRegion,
  findRegionForCoordinates,
  getEnabledRegions,
  getSavedRegionId,
  saveRegion,
} from "@/services/regionService";

const regionRow = {
  id: 7,
  slug: "vancouver",
  name: "Vancouver",
  display_order: 10,
  center_lat: 49.2827,
  center_lon: -123.1207,
  catchment_radius_m: 20_072,
};

describe("regionService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("maps enabled-region rows into the Explore display model", async () => {
    mockRpc.mockResolvedValue({ data: [regionRow], error: null });

    await expect(getEnabledRegions()).resolves.toEqual([
      {
        id: 7,
        slug: "vancouver",
        name: "Vancouver",
        displayOrder: 10,
        center: { latitude: 49.2827, longitude: -123.1207 },
        catchmentRadiusMeters: 20_072,
      },
    ]);
    expect(mockRpc).toHaveBeenCalledWith("get_enabled_regions");
  });

  it("automatically matches coordinates inside a region catchment", () => {
    const region = {
      id: 7,
      slug: "vancouver",
      name: "Vancouver",
      displayOrder: 10,
      center: { latitude: 49.2827, longitude: -123.1207 },
      catchmentRadiusMeters: 20_072,
    };

    expect(
      findRegionForCoordinates({ latitude: 49.3, longitude: -123.12 }, [region])
    ).toEqual(region);
    expect(
      findRegionForCoordinates({ latitude: 49.7, longitude: -123.12 }, [region])
    ).toBeNull();
  });

  it("persists and restores only valid region IDs", async () => {
    mockGetItem
      .mockResolvedValueOnce("7")
      .mockResolvedValueOnce("not-a-number");

    await expect(getSavedRegionId()).resolves.toBe(7);
    await expect(getSavedRegionId()).resolves.toBeNull();

    const region = {
      id: 7,
      slug: "vancouver",
      name: "Vancouver",
      displayOrder: 10,
      center: { latitude: 49.2827, longitude: -123.1207 },
      catchmentRadiusMeters: 20_072,
    };
    await saveRegion(region);
    await clearSavedRegion();
    expect(mockSetItem).toHaveBeenCalledWith("explore_last_region_v1", "7");
    expect(mockRemoveItem).toHaveBeenCalledWith("explore_last_region_v1");
  });
});
