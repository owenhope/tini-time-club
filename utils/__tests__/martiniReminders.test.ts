import {
  EVERGREEN_REMINDERS,
  reminderForDate,
  upcomingFridays,
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
  it("pins seasonal messages to their Fridays", () => {
    // 2027-01-01 is the first Friday of 2027.
    expect(reminderForDate(new Date(2027, 0, 1)).title).toContain("New year");
    // 2027-02-12 is the Friday nearest Valentine's Day.
    expect(reminderForDate(new Date(2027, 1, 12)).title).toContain("Roses");
    // 2027-06-25 is the first Friday of summer.
    expect(reminderForDate(new Date(2027, 5, 25)).title).toContain("Patio");
    // 2027-10-29 falls in Halloween week.
    expect(reminderForDate(new Date(2027, 9, 29)).title).toContain("wicked");
    // 2027-11-26 falls in Thanksgiving week.
    expect(reminderForDate(new Date(2027, 10, 26)).title).toContain("thanks");
    // 2027-12-31 falls in New Year's Eve week.
    expect(reminderForDate(new Date(2027, 11, 31)).title).toContain(
      "One last tini"
    );
  });

  it("rotates evergreen messages by week and is deterministic", () => {
    const a = reminderForDate(new Date(2027, 2, 5));
    const b = reminderForDate(new Date(2027, 2, 5));
    expect(a).toEqual(b);

    const nextWeek = reminderForDate(new Date(2027, 2, 12));
    expect(nextWeek).not.toEqual(a);
  });

  it("always returns a message", () => {
    for (const friday of upcomingFridays(new Date(2027, 0, 1), 104, 17)) {
      expect(reminderForDate(friday).title.length).toBeGreaterThan(0);
    }
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
