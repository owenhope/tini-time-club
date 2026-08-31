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

  it("builds the business-verification information route", () => {
    expect(
      routes.locationVerificationInfo({
        locationId: 42,
        name: "The Example Bar",
        address: "123 Main Street",
      })
    ).toEqual({
      pathname: "/location-verification-info",
      params: {
        locationId: "42",
        name: "The Example Bar",
        address: "123 Main Street",
      },
    });
  });
});
