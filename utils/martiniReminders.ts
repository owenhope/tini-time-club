/**
 * The Tini Time reminder message bank. Pure data + date logic (no Expo
 * imports) so the picker is unit-testable and the copy is easy to edit in one
 * place.
 *
 * Every user sees the same message on a given day. Reminders go out every
 * Friday, plus on each holiday's own date whatever the weekday; a holiday on a
 * Friday replaces that Friday's message. Other Fridays get a Friday-only
 * seasonal message or the evergreen bank, rotated by week-of-year. Bodies stay
 * under ~90 characters so iOS banners don't truncate them.
 */

export interface ReminderMessage {
  title: string;
  body: string;
}

/** Rotated by week-of-year; order is shuffled across moods on purpose. */
export const EVERGREEN_REMINDERS: readonly ReminderMessage[] = [
  {
    title: "It's tini time 🍸",
    body: "Friday night and the shaker's calling.",
  },
  { title: "Rate your pour 🍸", body: "Tonight's tini deserves a verdict." },
  {
    title: "Olive you a lot 🫒",
    body: "Treat yourself to a proper pour tonight.",
  },
  {
    title: "Defend your spot 👀",
    body: "Someone's coming for your Regular status tonight.",
  },
  { title: "Shaken or stirred?", body: "It's Friday. You know what to do." },
  {
    title: "Bring backup 🍸",
    body: "Martinis taste better in pairs — drag a friend out.",
  },
  {
    title: "The weekend starts wet",
    body: "Find a coupe with your name on it.",
  },
  {
    title: "Rank up tonight 📈",
    body: "Drink it, rate it — your next ring is waiting.",
  },
  { title: "Dry martini, wet weekend", body: "Get out there." },
  {
    title: "This is your sign",
    body: "It's cold, it's clear, it has an olive in it.",
  },
  { title: "Ice cold, dead classy", body: "Friday deserves a martini." },
  { title: "Be a critic tonight", body: "A fancy one. With an olive." },
  {
    title: "A coupe awaits",
    body: "Somewhere a bartender is polishing a glass just for you.",
  },
  { title: "Regulars don't ghost", body: "Your favorite bar misses you." },
  {
    title: "Friday's forecast 🍸",
    body: "100% chance of gin. Or vodka. Dealer's choice.",
  },
  {
    title: "One quick tini",
    body: "Be the friend who says it. Be the legend who stays for two.",
  },
  { title: "Life's too short", body: "For warm drinks, anyway. Tini time." },
  { title: "The club runs on reviews", body: "Do your part, agent 🍸" },
  { title: "That olive 🫒", body: "It isn't going to eat itself." },
  { title: "Stool. Nod. The usual.", body: "Go be a Regular tonight." },
  { title: "Two sips in", body: "That's where weekends actually begin." },
  {
    title: "5.0 or an honest 3?",
    body: "Either way, that bartender deserves a review.",
  },
  { title: "Clock out, coupe up 🍸", body: "The weekend is officially open." },
  { title: "Recruit for the club", body: "First round's their initiation 🍸" },
  {
    title: "You survived the week",
    body: "That's a martini-worthy achievement.",
  },
  { title: "One more to rank up?", body: "Only one way to find out." },
  { title: "The shaker hears all", body: "The shaker judges nothing. Go." },
  {
    title: "Someone out-reviewed you",
    body: "Your bar. Your spot. Take it back.",
  },
  { title: "A martini a week", body: "Keeps the mediocrity away." },
  { title: "Taste. Presentation.", body: "Judgment. You know the drill." },
  { title: "It's 5 o'clock", body: "Somewhere = here. Now." },
  { title: "Found a new spot?", body: "The club wants to know about it." },
  { title: "Chin up, pinky out", body: "It's tini time." },
  {
    title: "Your contacts list",
    body: "Someone in there needs a martini tonight. You know who.",
  },
  { title: "Your coupe runneth over", body: "Or it should. Fix that." },
  {
    title: "Top Shelf material",
    body: "Members are made on nights like this.",
  },
  {
    title: "Friday called 📞",
    body: "It wants you somewhere dim with something cold.",
  },
  { title: "Your palate has opinions", body: "Publish them." },
  {
    title: "Nothing good ever came",
    body: "From staying in on martini night.",
  },
  {
    title: "Gin is botanical 🌿",
    body: "We're not saying skip dinner. But it's basically a salad.",
  },
  {
    title: "Your couch can wait",
    body: "It'll still be there at midnight. Happy hour won't.",
  },
  { title: "Espresso martini counts", body: "We checked. It's Friday." },
  { title: "Dirty martini", body: "Clean conscience." },
  { title: "Dim lights, cold gin", body: "You know the place. Go." },
  {
    title: "The club has perks",
    body: "Like an excellent excuse for a Friday martini.",
  },
  { title: "Don't make us ask twice", body: "It's tini time 🍸" },
] as const;

interface DateRule {
  message: ReminderMessage;
  /** Whether the rule applies on this date. */
  matches: (date: Date) => boolean;
}

const isDay = (date: Date, month: number, day: number) =>
  date.getMonth() === month && date.getDate() === day;

const inWindow = (date: Date, month: number, from: number, to: number) =>
  date.getMonth() === month && date.getDate() >= from && date.getDate() <= to;

/**
 * Evening of the first Hanukkah candle (24 Kislev), [month, day] by year.
 * The Hebrew calendar moves it every year, and Hermes has no Hebrew Intl
 * calendar, so the dates are tabled. A test fails when the table runs short.
 */
export const HANUKKAH_FIRST_NIGHTS: Readonly<Record<number, [number, number]>> =
  {
    2026: [11, 4],
    2027: [11, 24],
    2028: [11, 12],
    2029: [11, 1],
    2030: [11, 20],
    2031: [11, 9],
    2032: [10, 27],
    2033: [11, 16],
    2034: [11, 6],
    2035: [11, 25],
    2036: [11, 13],
    2037: [11, 2],
    2038: [11, 21],
    2039: [11, 11],
    2040: [10, 29],
  };

const isHanukkahFirstNight = (date: Date) => {
  const firstNight = HANUKKAH_FIRST_NIGHTS[date.getFullYear()];
  return Boolean(firstNight) && isDay(date, firstNight[0], firstNight[1]);
};

const isChristmas = (date: Date) => isDay(date, 11, 25);

/** (US) Thanksgiving: the fourth Thursday of November. */
const isThanksgiving = (date: Date) =>
  date.getDay() === 4 && inWindow(date, 10, 22, 28);

/** Sent on the holiday's own date. First matching rule wins. */
export const HOLIDAY_REMINDERS: readonly DateRule[] = [
  {
    matches: (d) => isDay(d, 0, 1),
    message: {
      title: "New year, new rank 🥂",
      body: "The climb to Top Shelf starts tonight.",
    },
  },
  {
    matches: (d) => isDay(d, 1, 14),
    message: {
      title: "Roses are red 🌹",
      body: "Martinis are clear — happy tini time, my dear.",
    },
  },
  {
    matches: (d) => isDay(d, 9, 31),
    message: {
      title: "Something wicked 🎃",
      body: "This way pours.",
    },
  },
  {
    matches: isThanksgiving,
    message: {
      title: "Giving thanks 🦃",
      body: "For cold gin and good company.",
    },
  },
  {
    // Hanukkah starts on Christmas Day (e.g. 2035).
    matches: (d) => isChristmas(d) && isHanukkahFirstNight(d),
    message: {
      title: "Happy everything 🕎🎄",
      body: "Eight nights, one Christmas, and a martini for each.",
    },
  },
  {
    matches: isHanukkahFirstNight,
    message: {
      title: "Happy Hanukkah 🕎",
      body: "Light the candles, then pour something clear.",
    },
  },
  {
    matches: isChristmas,
    message: {
      title: "Merry & bright 🎄",
      body: "Deck the halls with gin and olives.",
    },
  },
  {
    matches: (d) => isDay(d, 11, 26),
    message: {
      title: "Boxing Day 🎁",
      body: "Leftovers can wait. The bar is open.",
    },
  },
  {
    matches: (d) => isDay(d, 11, 31),
    message: {
      title: "One last tini 🥂",
      body: "End the year Top Shelf style.",
    },
  },
];

/** Friday-only seasonal messages; windows hold exactly one Friday each. */
export const FRIDAY_SEASONAL_REMINDERS: readonly DateRule[] = [
  {
    // First Friday of summer.
    matches: (d) => inWindow(d, 5, 20, 26),
    message: {
      title: "Patio season ☀️",
      body: "Patio + martini = correct.",
    },
  },
];

const dayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  return (
    Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );
};

export type ReminderKind = "holiday" | "seasonal" | "rotating";

export interface ScheduledReminder {
  date: Date;
  kind: ReminderKind;
  message: ReminderMessage;
}

const reminderOn = (
  date: Date
): Omit<ScheduledReminder, "date"> | undefined => {
  const holiday = HOLIDAY_REMINDERS.find((rule) => rule.matches(date));
  if (holiday) return { kind: "holiday", message: holiday.message };
  // 5 = Friday in JS Date#getDay numbering.
  if (date.getDay() !== 5) return undefined;

  const seasonal = FRIDAY_SEASONAL_REMINDERS.find((rule) => rule.matches(date));
  if (seasonal) return { kind: "seasonal", message: seasonal.message };

  const week = Math.floor((dayOfYear(date) - 1) / 7);
  return {
    kind: "rotating",
    message: EVERGREEN_REMINDERS[week % EVERGREEN_REMINDERS.length],
  };
};

/**
 * The message every member sees on a given date: the holiday's on a holiday,
 * otherwise the Friday message. Undefined on any other day.
 */
export const reminderForDate = (date: Date): ReminderMessage | undefined =>
  reminderOn(date)?.message;

/** The next `count` Fridays at `hour` local time, starting after `from`. */
export const upcomingFridays = (
  from: Date,
  count: number,
  hour: number
): Date[] => {
  const fridays: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(hour, 0, 0, 0);
  while (cursor.getDay() !== 5 || cursor <= from) {
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(hour, 0, 0, 0);
  }
  for (let i = 0; i < count; i++) {
    fridays.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return fridays;
};

/**
 * Every reminder at `hour` local time after `from`, through the `weeks`th
 * upcoming Friday: each Friday plus each holiday in between, in date order.
 */
export const upcomingReminders = (
  from: Date,
  weeks: number,
  hour: number
): ScheduledReminder[] => {
  const fridays = upcomingFridays(from, weeks, hour);
  const last = fridays[fridays.length - 1];
  if (!last) return [];

  const reminders: ScheduledReminder[] = [];
  const cursor = new Date(from);
  cursor.setHours(hour, 0, 0, 0);
  while (cursor <= last) {
    const reminder = cursor > from ? reminderOn(cursor) : undefined;
    if (reminder) reminders.push({ date: new Date(cursor), ...reminder });
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(hour, 0, 0, 0);
  }
  return reminders;
};
