jest.mock("@/utils/supabase", () => ({ supabase: { rpc: jest.fn() } }));

import {
  decodePassport,
  reconcileMyPassport,
} from "@/services/passportService";
import { supabase } from "@/utils/supabase";

describe("decodePassport", () => {
  it("decodes the private RPC projection", () => {
    expect(
      decodePassport({
        points: 6,
        stamps: [
          {
            id: "a",
            key: "locations-1",
            series: "Totals",
            metric: "locations",
            threshold: 1,
            points: 1,
            title: "Total Locations",
            unit: "locations",
            hint: "Go",
            artwork_key: "location-outline",
            progress: 2,
            earned: true,
            awarded_at: "2026-09-04",
            subject_a: null,
            subject_b: null,
          },
        ],
      })
    ).toMatchObject({
      points: 6,
      stamps: [
        { key: "locations-1", artworkKey: "location-outline", earned: true },
      ],
    });
  });

  it("rejects a malformed stamp collection", () => {
    expect(() => decodePassport({ points: 0 })).toThrow(
      "Passport data is invalid"
    );
  });

  it("coerces an unknown metric to the generic stamp shape", () => {
    const passport = decodePassport({
      points: 1,
      stamps: [
        {
          id: "b",
          key: "mystery-1",
          series: "Mystery",
          metric: "brand_new_metric",
          threshold: 1,
          points: 1,
        },
      ],
    });
    expect(passport.stamps[0].metric).toBe("shares");
  });

  it("decodes newly unlocked stamps from reconciliation", async () => {
    (supabase.rpc as jest.Mock).mockResolvedValue({
      data: {
        points: 35,
        previousPoints: 10,
        unlocked: [
          {
            id: "stamp-5",
            key: "locations-5",
            series: "Venues",
            metric: "locations",
            threshold: 5,
            points: 25,
            title: "Total Locations",
            label: "5 locations",
            unit: "locations",
            hint: "Review venues",
            artwork_key: "locations",
            progress: 5,
            earned: true,
            awarded_at: "2026-09-04",
            subject_a: null,
            subject_b: null,
          },
        ],
      },
      error: null,
    });

    await expect(reconcileMyPassport()).resolves.toMatchObject({
      points: 35,
      unlocked: [{ key: "locations-5", points: 25 }],
    });
  });
});
