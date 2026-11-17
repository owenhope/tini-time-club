import { clientAddress, createRateLimiter } from "./rateLimit";

const requestFrom = (forwardedFor?: string) =>
  new Request("https://example.test", {
    headers: forwardedFor ? { "x-forwarded-for": forwardedFor } : {},
  });

describe("edge rate limiter", () => {
  it("keys on the first forwarded address", () => {
    expect(clientAddress(requestFrom("203.0.113.9, 10.0.0.1"))).toBe(
      "203.0.113.9"
    );
    expect(clientAddress(requestFrom())).toBe("unknown");
  });

  it("limits a client within one window", () => {
    const limited = createRateLimiter({ limit: 2, windowMs: 60_000 });
    const request = requestFrom("203.0.113.9");
    expect([1, 2, 3].map(() => limited(request, 1_000))).toEqual([
      false,
      false,
      true,
    ]);
  });

  it("opens a fresh window once the old one expires", () => {
    const limited = createRateLimiter({ limit: 1, windowMs: 1_000 });
    const request = requestFrom("203.0.113.9");
    expect(limited(request, 0)).toBe(false);
    expect(limited(request, 10)).toBe(true);
    expect(limited(request, 1_000)).toBe(false);
  });

  it("stays bounded under a flood of distinct addresses", () => {
    const limited = createRateLimiter({
      limit: 5,
      windowMs: 60_000,
      maxClients: 3,
    });
    for (let i = 0; i < 50; i++) {
      limited(requestFrom(`203.0.113.${i}`), 1_000);
    }
    // The newest client is still tracked and counted.
    expect(limited(requestFrom("203.0.113.49"), 1_001)).toBe(false);
  });
});
