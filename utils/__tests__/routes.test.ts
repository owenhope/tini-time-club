import { routes } from "@/utils/routes";

describe("Explore routes", () => {
  it("builds canonical view routes", () => {
    expect(routes.discover({ view: "members" })).toEqual({
      pathname: "/discover",
      params: { view: "members" },
    });
  });

  it("maps the old places helper onto Explore's map view", () => {
    expect(
      routes.places({ lat: "49.3", lon: "-123.1", locationId: 42 })
    ).toEqual({
      pathname: "/discover",
      params: {
        view: "map",
        lat: "49.3",
        lon: "-123.1",
        locationId: 42,
      },
    });
  });

  it("keeps place profiles on their existing public path", () => {
    expect(routes.place(42)).toBe("/places/42");
  });
});
