import { getMarkerFocusRegion } from "@/utils/mapMarkerFocus";

describe("getMarkerFocusRegion", () => {
  it("places the selected pin slightly below the visible map center", () => {
    const mapHeight = 600;
    const coveredHeight = 200;
    const visibleHeight = mapHeight - coveredHeight;
    const region = {
      latitude: 49.3,
      longitude: -123.1,
      latitudeDelta: 0.12,
      longitudeDelta: 0.12,
    };

    const focused = getMarkerFocusRegion({
      location: { latitude: 49.3, longitude: -123.1 },
      region,
      mapHeight,
      coveredHeight,
    });
    const pinY =
      mapHeight / 2 -
      ((region.latitude - focused.latitude) / focused.latitudeDelta) *
        mapHeight;

    expect(pinY).toBeCloseTo(visibleHeight * 0.6);
    expect(focused.latitudeDelta).toBe(0.04);
    expect(focused.longitudeDelta).toBe(0.04);
  });

  it("does not zoom back out when the map is already tighter", () => {
    const focused = getMarkerFocusRegion({
      location: { latitude: 49.3, longitude: -123.1 },
      region: {
        latitude: 49.3,
        longitude: -123.1,
        latitudeDelta: 0.02,
        longitudeDelta: 0.03,
      },
      mapHeight: 600,
      coveredHeight: 200,
    });

    expect(focused.latitudeDelta).toBe(0.02);
    expect(focused.longitudeDelta).toBe(0.03);
  });
});
