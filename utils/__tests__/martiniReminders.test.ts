import {
  EVERGREEN_REMINDERS,
  FRIDAY_SEASONAL_REMINDERS,
  HANUKKAH_FIRST_NIGHTS,
  HOLIDAY_REMINDERS,
  reminderForDate,
  upcomingFridays,
  upcomingReminders,
} from "../martiniReminders";

describe("EVERGREEN_REMINDERS", () => {
  it("keeps bodies short enough for an iOS banner", () => {
    for (const message of EVERGREEN_REMINDERS) {
      expect(message.body.length).toBeLessThanOrEqual(90);
      expect(message.title.length).toBeLessThanOrEqual(40);
    }
  });

  it("has no duplicate messages", () => {
    const keys = EVERGREEN_REMINDERS.map((m) => `${m.title}|${m.body}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("reminderForDate", () => {
  const titleOn = (y: number, m: number, d: number) =>
    reminderForDate(new Date(y, m, d, 16))?.title;

  it("sends holidays on their own date, whatever the weekday", () => {
    expect(titleOn(2027, 0, 1)).toContain("New year"); // Friday
    expect(titleOn(2027, 1, 14)).toContain("Roses"); // Sunday
    expect(titleOn(2026, 9, 31)).toContain("wicked"); // Saturday
    expect(titleOn(2026, 10, 26)).toContain("thanks"); // Thursday
    expect(titleOn(2026, 11, 4)).toContain("Hanukkah"); // Friday
    expect(titleOn(2027, 11, 24)).toContain("Hanukkah"); // Friday
    expect(titleOn(2026, 11, 25)).toContain("Merry"); // Friday
    expect(titleOn(2026, 11, 26)).toContain("Boxing Day"); // Saturday
    expect(titleOn(2026, 11, 31)).toContain("One last tini"); // Thursday
  });

  it("combines Hanukkah and Christmas when they share a date", () => {
    expect(titleOn(2035, 11, 25)).toContain("Happy everything");
  });

  it("sends nothing on an ordinary weekday", () => {
    expect(titleOn(2027, 2, 3)).toBeUndefined(); // Wednesday
  });

  it("keeps Friday-only seasonal messages on Fridays", () => {
    expect(titleOn(2027, 5, 25)).toContain("Patio");
  });

  it("keeps holiday and seasonal copy short enough for an iOS banner", () => {
    for (const { message } of [
      ...HOLIDAY_REMINDERS,
      ...FRIDAY_SEASONAL_REMINDERS,
    ]) {
      expect(message.body.length).toBeLessThanOrEqual(90);
      expect(message.title.length).toBeLessThanOrEqual(40);
    }
  });

  it("has Hanukkah dates for the next five years", () => {
    const year = new Date().getFullYear();
    for (let y = year; y < year + 5; y++) {
      expect(HANUKKAH_FIRST_NIGHTS[y]).toBeDefined();
    }
  });

  it("rotates evergreen messages by week and is deterministic", () => {
    const a = reminderForDate(new Date(2027, 2, 5));
    const b = reminderForDate(new Date(2027, 2, 5));
    expect(a).toEqual(b);

    const nextWeek = reminderForDate(new Date(2027, 2, 12));
    expect(nextWeek).not.toEqual(a);
  });

  it("always has a message for a Friday", () => {
    for (const friday of upcomingFridays(new Date(2027, 0, 1), 104, 17)) {
      expect(reminderForDate(friday)?.title.length).toBeGreaterThan(0);
    }
  });
});

describe("upcomingReminders", () => {
  it("adds holidays between Fridays, in date order", () => {
    // From Wed 2026-12-23 through the 2nd Friday (2027-01-01).
    const reminders = upcomingReminders(new Date(2026, 11, 23, 9), 2, 16);
    expect(
      reminders.map(({ date, kind }) => [date.getMonth(), date.getDate(), kind])
    ).toEqual([
      [11, 25, "holiday"],
      [11, 26, "holiday"],
      [11, 31, "holiday"],
      [0, 1, "holiday"],
    ]);
  });

  it("stays under the 64 pending local notifications iOS allows", () => {
    for (let month = 0; month < 12; month++) {
      const reminders = upcomingReminders(new Date(2027, month, 1), 40, 16);
      expect(reminders.length).toBeLessThan(64);
    }
  });

  it("skips today's reminder once its hour has passed", () => {
    // Christmas 2026 at 5pm: the 4pm reminder is gone.
    const [first] = upcomingReminders(new Date(2026, 11, 25, 17), 1, 16);
    expect(first.date.getDate()).toBe(26);
  });
});

describe("upcomingFridays", () => {
  it("returns consecutive Fridays at the requested hour", () => {
    // 2027-03-01 is a Monday.
    const fridays = upcomingFridays(new Date(2027, 2, 1), 4, 17);
    expect(fridays).toHaveLength(4);
    for (const friday of fridays) {
      expect(friday.getDay()).toBe(5);
      expect(friday.getHours()).toBe(17);
    }
    expect(fridays[0].getDate()).toBe(5);
    expect(fridays[1].getDate()).toBe(12);
  });

  it("skips a Friday that has already passed today", () => {
    // 2027-03-05 18:00 is a Friday evening after the reminder hour.
    const fridays = upcomingFridays(new Date(2027, 2, 5, 18, 0), 1, 17);
    expect(fridays[0].getDate()).toBe(12);
  });

  it("includes today when the reminder hour is still ahead", () => {
    // 2027-03-05 09:00, a Friday morning.
    const fridays = upcomingFridays(new Date(2027, 2, 5, 9, 0), 1, 17);
    expect(fridays[0].getDate()).toBe(5);
  });
});
