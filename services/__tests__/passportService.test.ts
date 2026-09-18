import { clearMemberPoints, getMemberPoints } from "@/utils/memberPoints";
jest.mock("@/utils/supabase", () => ({
  supabase: {
    rpc: jest.fn(),
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: "member-1" } } },
        error: null,
      })),
    },
  },
}));

import {
  decodePassport,
  reconcileMyPassport,
  getMemberPassport,
  getMyPassport,
} from "@/services/passportService";
import { supabase } from "@/utils/supabase";

beforeEach(() => {
  clearMemberPoints();
  jest.clearAllMocks();
});

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

  it.each([undefined, null, NaN, Infinity, -1])(
    "preserves unknown point totals (%s)",
    (points) => {
      expect(decodePassport({ points, stamps: [] }).points).toBeNull();
    }
  );

  it("preserves confirmed zero points", () => {
    expect(decodePassport({ points: 0, stamps: [] }).points).toBe(0);
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

it("publishes own Passport points even when there are no new stamps", async () => {
  (supabase.rpc as jest.Mock).mockResolvedValue({
    data: { points: 500, unlocked: [] },
    error: null,
  });
  await reconcileMyPassport();
  expect(getMemberPoints("member-1")).toBe(500);
});

it("ignores older reads that finish after a newer total, including a revocation", async () => {
  let finish!: (value: unknown) => void;
  (supabase.rpc as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const older = getMemberPassport("member-2");
  (supabase.rpc as jest.Mock).mockResolvedValueOnce({
    data: { points: 0, stamps: [] },
    error: null,
  });
  await getMemberPassport("member-2");
  finish({ data: { points: 500, stamps: [] }, error: null });
  await expect(older).resolves.toMatchObject({ points: 0 });
  expect(getMemberPoints("member-2")).toBe(0);
});

it("rejects a self-scoped response after sign-out", async () => {
  let finish!: (value: unknown) => void;
  (supabase.rpc as jest.Mock).mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  const pending = getMyPassport();
  await new Promise<void>((resolve) => setImmediate(resolve));
  clearMemberPoints();
  finish({ data: { points: 500, stamps: [] }, error: null });
  await expect(pending).rejects.toThrow("Passport session changed");
  expect(getMemberPoints("member-1")).toBeNull();
});

it("accepts a newer lower total and does not replace it with unavailable data", async () => {
  (supabase.rpc as jest.Mock).mockResolvedValueOnce({
    data: { points: 500, stamps: [] },
    error: null,
  });
  await getMemberPassport("member-2");
  (supabase.rpc as jest.Mock).mockResolvedValueOnce({
    data: { points: 0, stamps: [] },
    error: null,
  });
  await getMemberPassport("member-2");
  expect(getMemberPoints("member-2")).toBe(0);
  (supabase.rpc as jest.Mock).mockResolvedValueOnce({
    data: { points: null, stamps: [] },
    error: null,
  });
  await getMemberPassport("member-2");
  expect(getMemberPoints("member-2")).toBe(0);
  expect(getMemberPoints("member-1")).toBeNull();
});
