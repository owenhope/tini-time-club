import { getClusterPressRegion } from "@/utils/mapClusterRegion";

const tightRegion = {
  latitude: 49.3104,
  longitude: -123.0815,
  latitudeDelta: 0.001,
  longitudeDelta: 0.001,
};

describe("getClusterPressRegion", () => {
  it("keeps a cluster tap zooming in from a tight location-focused map", () => {
    const nextRegion = getClusterPressRegion({
      currentRegion: tightRegion,
      clusterCoordinate: [-123.0815, 49.3104],
      fitPadding: 1.8,
      minDelta: 0.008,
      fallbackZoom: 0.4,
    });

    expect(nextRegion?.latitudeDelta).toBeLessThan(tightRegion.latitudeDelta);
    expect(nextRegion?.longitudeDelta).toBeLessThan(tightRegion.longitudeDelta);
  });

  it("fits two close child markers without zooming back out", () => {
    const nextRegion = getClusterPressRegion({
      currentRegion: tightRegion,
      childCoordinates: [
        [-123.0815, 49.3104],
        [-123.0811, 49.3107],
      ],
      fitPadding: 1.8,
      minDelta: 0.008,
      fallbackZoom: 0.4,
    });

    expect(nextRegion?.latitudeDelta).toBeLessThan(tightRegion.latitudeDelta);
    expect(nextRegion?.longitudeDelta).toBeLessThan(tightRegion.longitudeDelta);
  });
});
