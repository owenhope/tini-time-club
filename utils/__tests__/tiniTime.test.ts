import GREETINGS_BY_DAY, { getTiniTimeGreeting } from "@/utils/tiniTime";

describe("getTiniTimeGreeting", () => {
  it("has a large, even bank for every weekday", () => {
    expect(GREETINGS_BY_DAY).toHaveLength(7);
    for (const greetings of GREETINGS_BY_DAY) {
      expect(greetings).toHaveLength(12);
    }
  });

  it("has no duplicate greeting pairs", () => {
    const greetings = GREETINGS_BY_DAY.flat();
    const pairs = new Set(
      greetings.map(({ headline, subline }) => `${headline}\n${subline}`)
    );
    expect(pairs.size).toBe(84);
  });

  it("keeps every greeting rooted in drinks or bar culture", () => {
    const clubLanguage =
      /🍸|\b(?:martinis?|drinks?|bars?|coupes?|glass(?:es)?|olives?|gin|vodka|spirits?|rounds?|sips?|garnishes?|twists?|dry|cocktails?|stems?|bartenders?|tasting|orders?|nightcap|regulars?)\b|\b(?:pour|shak|stir|chill)\w*/i;

    const genericGreetings = GREETINGS_BY_DAY.flat()
      .filter(
        ({ headline, subline }) => !clubLanguage.test(`${headline} ${subline}`)
      )
      .map(({ headline }) => headline);

    expect(genericGreetings).toEqual([]);
  });

  it("keeps a greeting stable throughout the same local day", () => {
    const morning = new Date(2026, 7, 4, 8, 15);
    const evening = new Date(2026, 7, 4, 23, 45);
    expect(getTiniTimeGreeting(morning)).toBe(getTiniTimeGreeting(evening));
  });

  it("advances to another variation on the same weekday next week", () => {
    const thisTuesday = new Date(2026, 7, 4);
    const nextTuesday = new Date(2026, 7, 11);
    expect(getTiniTimeGreeting(thisTuesday)).not.toBe(
      getTiniTimeGreeting(nextTuesday)
    );
  });

  it("does not repeat on the same weekday within the 12-week rotation", () => {
    const greetings = Array.from({ length: 12 }, (_, week) =>
      getTiniTimeGreeting(new Date(2026, 7, 4 + week * 7))
    );
    expect(new Set(greetings).size).toBe(12);
  });

  it("keeps display headlines sentence-cased and short", () => {
    for (const { headline } of GREETINGS_BY_DAY.flat()) {
      expect(headline[0]).toBe(headline[0].toUpperCase());
      expect(headline.length).toBeLessThanOrEqual(30);
    }
  });

  it("uses at most one emoji, at the end", () => {
    const emoji = /\p{Extended_Pictographic}/gu;
    for (const { headline, subline } of GREETINGS_BY_DAY.flat()) {
      expect(subline).not.toMatch(emoji);
      const found = headline.match(emoji) ?? [];
      expect(found.length).toBeLessThanOrEqual(1);
      if (found.length) {
        expect(headline.trimEnd()).toMatch(/\p{Extended_Pictographic}$/u);
      }
    }
  });
});
