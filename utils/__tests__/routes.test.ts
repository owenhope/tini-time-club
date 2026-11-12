import { routes } from "@/utils/routes";

describe("Explore routes", () => {
  it("builds canonical view routes", () => {
    expect(routes.discover({ view: "members" })).toEqual({
      pathname: "/discover",
      params: { view: "members" },
    });
  });

  it("keeps place profiles on their existing public path", () => {
    expect(routes.place(42)).toBe("/places/42");
  });
});

describe("Member profile routes", () => {
  it("keeps the plain username path when no profile id is known", () => {
    expect(routes.user("olive")).toBe("/users/olive");
  });

  it("carries the profile id so a renamed member still resolves", () => {
    expect(routes.user("olive", "member-1")).toBe(
      "/users/olive?profileId=member-1"
    );
  });
});
