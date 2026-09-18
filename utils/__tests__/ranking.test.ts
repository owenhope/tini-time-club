import { RANK_TIERS, getRankTier, getRankProgress } from "../ranking";

describe("RANK_TIERS", () => {
  it("is ordered by ascending minimum", () => {
    const mins = RANK_TIERS.map((t) => t.min);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
  });

  it("gives every tier a distinct gradient palette", () => {
    const colors = RANK_TIERS.flatMap((tier) => [
      tier.color,
      tier.sheen,
      tier.shade,
    ]);
    expect(new Set(colors).size).toBe(colors.length);
  });
});

describe("getRankTier", () => {
  it("holds the first tier from confirmed zero", () => {
    expect(getRankTier(0)?.key).toBe("well");
    expect(getRankTier(null)).toBeNull();
    expect(getRankTier(undefined)).toBeNull();
  });

  it("returns the tier at each threshold", () => {
    expect(getRankTier(1)?.key).toBe("well");
    expect(getRankTier(49)?.key).toBe("well");
    expect(getRankTier(50)?.key).toBe("call");
    expect(getRankTier(499)?.key).toBe("call");
    expect(getRankTier(500)?.key).toBe("premium");
    expect(getRankTier(999)?.key).toBe("premium");
    expect(getRankTier(1000)?.key).toBe("topShelf");
    expect(getRankTier(5000)?.key).toBe("topShelf");
  });
});

describe("getRankProgress", () => {
  it("starts at the first tier and targets the second from zero", () => {
    const p = getRankProgress(0)!;
    expect(p.tier?.key).toBe("well");
    expect(p.next?.key).toBe("call");
    expect(p.remaining).toBe(50);
    expect(p.fraction).toBe(0);
  });

  it("reports remaining and cumulative progress toward the next tier", () => {
    const p = getRankProgress(100)!;
    expect(p.tier?.key).toBe("call");
    expect(p.next?.key).toBe("premium");
    expect(p.remaining).toBe(400);
    expect(p.fraction).toBeCloseTo(100 / 500);
  });

  it("does not reset the bar when a member reaches a new tier", () => {
    const p = getRankProgress(50)!;
    expect(p.tier?.key).toBe("call");
    expect(p.next?.key).toBe("premium");
    expect(p.fraction).toBeCloseTo(50 / 500);
    expect(p.remaining).toBe(450);
  });

  it("caps at the top tier", () => {
    const p = getRankProgress(1000)!;
    expect(p.tier?.key).toBe("topShelf");
    expect(p.next).toBeNull();
    expect(p.remaining).toBe(0);
    expect(p.fraction).toBe(1);
  });

  it.each([null, undefined, NaN, Infinity, -3])(
    "leaves invalid or unknown points %s unranked",
    (points) => {
      expect(getRankTier(points)).toBeNull();
      expect(getRankProgress(points)).toBeNull();
    }
  );
});
