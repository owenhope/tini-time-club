import { layoutMapPins } from "@/utils/mapPinLayout";

const place = (
  id: number,
  lat: number,
  long: number,
  is_golden_glass = false
) => ({ id, lat, long, is_golden_glass });

// Four ordinary places a few metres apart: always one cluster.
const quay = [
  place(1, 49.31, -123.08),
  place(2, 49.31002, -123.08001),
  place(3, 49.30999, -123.08002),
  place(4, 49.31001, -123.07999),
];
const city = {
  latitude: 49.31,
  longitude: -123.08,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};
const viewport = { width: 400, height: 700 };
const ids = (places: { id: number }[]) => places.map((p) => p.id).sort();

describe("layoutMapPins", () => {
  it("folds a liked place that would land on a cluster into it as a badge", () => {
    const liked = place(5, 49.3101, -123.0801);
    const layout = layoutMapPins({
      places: [...quay, liked],
      favoriteIds: new Set(["5"]),
      region: city,
      viewport,
      selectedId: null,
      specialsStandAlone: true,
    });

    expect(layout.clusters).toHaveLength(1);
    expect(ids(layout.clusters[0].members)).toEqual([1, 2, 3, 4, 5]);
    expect(layout.clusters[0].favoriteCount).toBe(1);
    expect(layout.clusters[0].goldenCount).toBe(0);
    expect(layout.pins).toEqual([]);
  });

  it("lets gold and pink places with room stand alone at city zoom", () => {
    const golden = place(6, 49.3, -123.06, true);
    const liked = place(7, 49.32, -123.1);
    const layout = layoutMapPins({
      places: [...quay, golden, liked],
      favoriteIds: new Set(["7"]),
      region: city,
      viewport,
      selectedId: null,
      specialsStandAlone: true,
    });

    expect(ids(layout.clusters[0].members)).toEqual([1, 2, 3, 4]);
    expect(layout.clusters[0].goldenCount).toBe(0);
    expect(ids(layout.pins)).toEqual([6, 7]);
  });

  it("draws overlapping gold places with room as one counted group", () => {
    const layout = layoutMapPins({
      places: [
        ...quay,
        place(8, 49.3, -123.06, true),
        place(9, 49.30001, -123.06001, true),
      ],
      favoriteIds: new Set(),
      region: city,
      viewport,
      selectedId: null,
      specialsStandAlone: true,
    });

    expect(layout.groups.map(ids)).toEqual([[8, 9]]);
    expect(layout.pins).toEqual([]);
  });

  it("clusters everything past city zoom and counts what is inside", () => {
    const layout = layoutMapPins({
      places: [...quay, place(10, 49.31, -123.08, true)],
      favoriteIds: new Set(["1"]),
      region: { ...city, latitudeDelta: 1, longitudeDelta: 1 },
      viewport,
      selectedId: null,
      specialsStandAlone: false,
    });

    expect(layout.clusters).toHaveLength(1);
    expect(layout.clusters[0].goldenCount).toBe(1);
    expect(layout.clusters[0].favoriteCount).toBe(1);
  });

  it("changes a cluster's key when its badges change", () => {
    const base = {
      places: [...quay, place(11, 49.3101, -123.0801)],
      region: city,
      viewport,
      selectedId: null,
      specialsStandAlone: true,
    };
    const plain = layoutMapPins({ ...base, favoriteIds: new Set() });
    const liked = layoutMapPins({ ...base, favoriteIds: new Set(["11"]) });

    expect(liked.clusters[0].key).not.toBe(plain.clusters[0].key);
  });

  it("draws every place as a pin before the map has a size", () => {
    const layout = layoutMapPins({
      places: quay,
      favoriteIds: new Set(),
      region: city,
      viewport: { width: 0, height: 0 },
      selectedId: null,
      specialsStandAlone: true,
    });

    expect(layout.clusters).toEqual([]);
    expect(layout.pins).toBe(quay);
  });
});
