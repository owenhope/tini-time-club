import {
  groupGoldenGlassPins,
  getGoldenGlassGroupRegion,
} from "../goldenGlassMapGroups";

const region = {
  latitude: 49.28,
  longitude: -123.12,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};
const viewport = { width: 400, height: 700 };
const first = { id: 1, lat: 49.28, long: -123.12 };
const second = { id: 2, lat: 49.28, long: -123.115 };

it("groups a pair of overlapping pins and separates them as the map zooms in", () => {
  expect(groupGoldenGlassPins([first, second], region, viewport, null)).toEqual(
    [[first, second]]
  );
  const closer = { ...region, latitudeDelta: 0.01, longitudeDelta: 0.01 };
  expect(groupGoldenGlassPins([first, second], closer, viewport, null)).toEqual(
    [[first], [second]]
  );
});

it("keeps clear pins separate along either screen axis", () => {
  const east = { ...first, id: 2, long: -123.1 };
  const north = { ...first, id: 3, lat: 49.3 };
  expect(
    groupGoldenGlassPins([first, east, north], region, viewport, null)
  ).toEqual([[first], [east], [north]]);
});

it("joins chains of overlapping pins into one group without losing members", () => {
  const third = { ...second, id: 3, long: -123.102 };
  expect(
    groupGoldenGlassPins([first, second, third], region, viewport, null)
  ).toEqual([[first, second], [third]]);
  const bridge = { ...second, id: 4, long: -123.11 };
  expect(
    groupGoldenGlassPins([first, second, third, bridge], region, viewport, null)
  ).toEqual([[first, second, third, bridge]]);
});

it("uses the larger footprint of a selected pin", () => {
  const near = { ...second, long: first.long + 0.011 };
  expect(
    groupGoldenGlassPins([first, near], region, viewport, null)
  ).toHaveLength(2);
  expect(
    groupGoldenGlassPins([first, near], region, viewport, first.id)
  ).toHaveLength(1);
});

it("zooms inward even for coincident venues", () => {
  const duplicate = { ...first, id: 2 };
  const next = getGoldenGlassGroupRegion([first, duplicate], region);
  expect(next.latitude).toBe(first.lat);
  expect(next.longitude).toBe(first.long);
  expect(next.latitudeDelta).toBeLessThan(region.latitudeDelta);
  expect(next.longitudeDelta).toBeLessThan(region.longitudeDelta);
});

it("handles nearby pins on opposite sides of the date line", () => {
  const west = { ...first, long: 179.999 };
  const east = { ...second, long: -179.999 };
  const nearDateLine = { ...region, longitude: 180 };
  expect(
    groupGoldenGlassPins([west, east], nearDateLine, viewport, null)
  ).toEqual([[west, east]]);
  expect(
    Math.abs(getGoldenGlassGroupRegion([west, east], nearDateLine).longitude)
  ).toBeCloseTo(180);
});
