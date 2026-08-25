import { mergeMapLocations, normalizeMapLocations } from "@/utils/mapLocations";

describe("map location state", () => {
  it("keeps pins with numeric-string coordinates instead of filtering them out", () => {
    expect(
      normalizeMapLocations([
        { id: 1, lat: "49.28", long: "-123.12" },
        { id: 2, lat: null, long: "-123.11" },
      ])
    ).toEqual([{ id: 1, lat: 49.28, long: -123.12 }]);
  });

  it("retains an existing pin when a later viewport response is empty", () => {
    const first = [{ id: 1, lat: 49.28, long: -123.12 }];

    expect(mergeMapLocations(first, [])).toEqual(first);
  });

  it("updates an existing pin and adds newly discovered pins", () => {
    expect(
      mergeMapLocations(
        [{ id: 1, lat: 49.28, long: -123.12 }],
        [
          { id: 1, lat: 49.29, long: -123.13 },
          { id: 2, lat: 49.3, long: -123.14 },
        ]
      )
    ).toEqual([
      { id: 1, lat: 49.29, long: -123.13 },
      { id: 2, lat: 49.3, long: -123.14 },
    ]);
  });
});
