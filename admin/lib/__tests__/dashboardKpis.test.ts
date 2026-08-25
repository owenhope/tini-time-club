import { dashboardKpisFromOverview } from "../dashboardKpis";

describe("dashboard KPI projection", () => {
  it("maps the bounded analytics rollup to the dashboard contract", () => {
    expect(
      dashboardKpisFromOverview({
        totals: { members: 120, reviews: 300, places: 45 },
        current: {
          members: 12,
          reviews: 30,
          places: 4,
          follows: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          indexInteractions: 0,
        },
        previous: {
          members: 8,
          reviews: 20,
          places: 3,
          follows: 0,
          likes: 0,
          comments: 0,
          shares: 0,
          indexInteractions: 0,
        },
        membersByDay: [{ day: "2026-08-25", count: 12 }],
        reviewsByDay: [{ day: "2026-08-25", count: 30 }],
        placesByDay: [{ day: "2026-08-25", count: 4 }],
      })
    ).toEqual({
      users: {
        total: 120,
        current: 12,
        previous: 8,
        byDay: [{ day: "2026-08-25", count: 12 }],
      },
      reviews: {
        total: 300,
        current: 30,
        previous: 20,
        byDay: [{ day: "2026-08-25", count: 30 }],
      },
      locations: {
        total: 45,
        current: 4,
        previous: 3,
        byDay: [{ day: "2026-08-25", count: 4 }],
      },
    });
  });
});
