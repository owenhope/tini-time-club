import GREETINGS, { getTiniTimeGreeting } from "@/utils/tiniTime";

describe("getTiniTimeGreeting", () => {
  it("has one greeting per day of the week", () => {
    expect(GREETINGS).toHaveLength(7);
  });

  it("gives each day a different headline", () => {
    const headlines = new Set(GREETINGS.map((g) => g.headline));
    expect(headlines.size).toBe(7);
  });

  it("picks the greeting by weekday", () => {
    // 2026-08-02 is a Sunday, so the week's greetings run in order from it.
    for (let day = 0; day < 7; day++) {
      const date = new Date(2026, 7, 2 + day);
      expect(getTiniTimeGreeting(date)).toBe(GREETINGS[date.getDay()]);
    }
  });

  it("keeps the display headlines sentence-cased and short", () => {
    for (const { headline } of GREETINGS) {
      expect(headline[0]).toBe(headline[0].toUpperCase());
      expect(headline.length).toBeLessThanOrEqual(30);
    }
  });

  it("uses at most one emoji, at the end", () => {
    const emoji = /\p{Extended_Pictographic}/gu;
    for (const { headline, subline } of GREETINGS) {
      expect(subline).not.toMatch(emoji);
      const found = headline.match(emoji) ?? [];
      expect(found.length).toBeLessThanOrEqual(1);
      if (found.length)
        expect(headline.trimEnd()).toMatch(/\p{Extended_Pictographic}$/u);
    }
  });
});
