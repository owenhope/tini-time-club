import { withTimeout } from "../async";

describe("withTimeout", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("returns a result that settles before the deadline", async () => {
    await expect(withTimeout(Promise.resolve("ready"), 100)).resolves.toBe(
      "ready"
    );
  });

  it("rejects a stalled request after the deadline", async () => {
    jest.useFakeTimers();
    const request = withTimeout(
      new Promise<string>(() => {}),
      100,
      "Session check timed out"
    );

    jest.advanceTimersByTime(100);

    await expect(request).rejects.toThrow("Session check timed out");
  });
});
