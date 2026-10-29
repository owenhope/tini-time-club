import { MAX_QUERY_LATITUDE, toQueryBounds } from "@/utils/mapQueryBounds";

const widths = (slices: ReturnType<typeof toQueryBounds>) =>
  slices.map((slice) => slice.maxLong - slice.minLong);

describe("toQueryBounds", () => {
  it("leaves a city-sized view as one unchanged query", () => {
    const vancouver = {
      minLat: 49.2,
      maxLat: 49.4,
      minLong: -123.2,
      maxLong: -123,
    };
    expect(toQueryBounds(vancouver)).toEqual([vancouver]);
  });

  it("splits a fully zoomed-out view into slices narrower than 180°, off the poles", () => {
    const slices = toQueryBounds({
      minLat: -150,
      maxLat: 150,
      minLong: -400,
      maxLong: 400,
    });

    expect(slices[0].minLong).toBe(-180);
    expect(slices[slices.length - 1].maxLong).toBe(180);
    expect(Math.max(...widths(slices))).toBeLessThan(180);
    for (const slice of slices) {
      expect(slice.minLat).toBe(-MAX_QUERY_LATITUDE);
      expect(slice.maxLat).toBe(MAX_QUERY_LATITUDE);
    }
  });

  it("splits a view that crosses the antimeridian instead of flipping it", () => {
    // Centred on Fiji: the padded view runs from 170° east past 180°.
    const slices = toQueryBounds({
      minLat: -20,
      maxLat: -15,
      minLong: 170,
      maxLong: 190,
    });

    expect(slices).toEqual([
      { minLat: -20, maxLat: -15, minLong: 170, maxLong: 180 },
      { minLat: -20, maxLat: -15, minLong: -180, maxLong: -170 },
    ]);
  });

  it("keeps a wide view's slices contiguous", () => {
    const slices = toQueryBounds({
      minLat: 0,
      maxLat: 60,
      minLong: -170,
      maxLong: 30,
    });

    expect(Math.max(...widths(slices))).toBeLessThan(180);
    slices.slice(1).forEach((slice, index) => {
      expect(slice.minLong).toBe(slices[index].maxLong);
    });
    expect(slices[slices.length - 1].maxLong).toBe(30);
  });
});
