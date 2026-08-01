/**
 * The Friday reminder message bank. Pure data + date logic (no Expo imports)
 * so the picker is unit-testable and the copy is easy to edit in one place.
 *
 * Every user sees the same message on a given Friday: seasonal messages are
 * pinned to date windows, and the evergreen bank rotates by week-of-year.
 * Bodies stay under ~90 characters so iOS banners don't truncate them.
 */

export interface ReminderMessage {
  title: string;
  body: string;
}

/** Rotated by week-of-year; order is shuffled across moods on purpose. */
export const EVERGREEN_REMINDERS: readonly ReminderMessage[] = [
  { title: "It's tini time 🍸", body: "Friday night and the shaker's calling." },
  { title: "Rate your pour 🍸", body: "Tonight's tini deserves a verdict." },
  { title: "Olive you a lot 🫒", body: "Treat yourself to a proper pour tonight." },
  { title: "Defend your spot 👀", body: "Someone's coming for your Regular status tonight." },
  { title: "Shaken or stirred?", body: "It's Friday. You know what to do." },
  { title: "Bring backup 🍸", body: "Martinis taste better in pairs — drag a friend out." },
  { title: "The weekend starts wet", body: "Find a coupe with your name on it." },
  { title: "Rank up tonight 📈", body: "Drink it, rate it — your next ring is waiting." },
  { title: "Dry martini, wet weekend", body: "Get out there." },
  { title: "This is your sign", body: "It's cold, it's clear, it has an olive in it." },
  { title: "Ice cold, dead classy", body: "Friday deserves a martini." },
  { title: "Be a critic tonight", body: "A fancy one. With an olive." },
  { title: "A coupe awaits", body: "Somewhere a bartender is polishing a glass just for you." },
  { title: "Regulars don't ghost", body: "Your favorite bar misses you." },
  { title: "Friday's forecast 🍸", body: "100% chance of gin. Or vodka. Dealer's choice." },
  { title: "One quick tini", body: "Be the friend who says it. Be the legend who stays for two." },
  { title: "Life's too short", body: "For warm drinks, anyway. Tini time." },
  { title: "The club runs on reviews", body: "Do your part, agent 🍸" },
  { title: "That olive 🫒", body: "It isn't going to eat itself." },
  { title: "Stool. Nod. The usual.", body: "Go be a Regular tonight." },
  { title: "Two sips in", body: "That's where weekends actually begin." },
  { title: "5.0 or an honest 3?", body: "Either way, that bartender deserves a review." },
  { title: "Clock out, coupe up 🍸", body: "The weekend is officially open." },
  { title: "Recruit for the club", body: "First round's their initiation 🍸" },
  { title: "You survived the week", body: "That's a martini-worthy achievement." },
  { title: "One more to rank up?", body: "Only one way to find out." },
  { title: "The shaker hears all", body: "The shaker judges nothing. Go." },
  { title: "Someone out-reviewed you", body: "Your bar. Your spot. Take it back." },
  { title: "A martini a week", body: "Keeps the mediocrity away." },
  { title: "Taste. Presentation.", body: "Judgment. You know the drill." },
  { title: "It's 5 o'clock", body: "Somewhere = here. Now." },
  { title: "Found a new spot?", body: "The club wants to know about it." },
  { title: "Chin up, pinky out", body: "It's tini time." },
  { title: "Your contacts list", body: "Someone in there needs a martini tonight. You know who." },
  { title: "Your coupe runneth over", body: "Or it should. Fix that." },
  { title: "Top Shelf material", body: "Members are made on nights like this." },
  { title: "Friday called 📞", body: "It wants you somewhere dim with something cold." },
  { title: "Your palate has opinions", body: "Publish them." },
  { title: "Nothing good ever came", body: "From staying in on martini night." },
  { title: "Gin is botanical 🌿", body: "We're not saying skip dinner. But it's basically a salad." },
  { title: "Your couch can wait", body: "It'll still be there at midnight. Happy hour won't." },
  { title: "Espresso martini counts", body: "We checked. It's Friday." },
  { title: "Dirty martini", body: "Clean conscience." },
  { title: "Dim lights, cold gin", body: "You know the place. Go." },
  { title: "Membership has perks", body: "Like an excellent excuse for a Friday martini." },
  { title: "Don't make us ask twice", body: "It's tini time 🍸" },
] as const;

interface SeasonalRule {
  message: ReminderMessage;
  /** Whether this Friday falls in the rule's window. */
  matches: (fridayDate: Date) => boolean;
}

const inWindow = (date: Date, month: number, from: number, to: number) =>
  date.getMonth() === month && date.getDate() >= from && date.getDate() <= to;

/** First matching rule wins; windows are chosen so at most one Friday hits each. */
export const SEASONAL_REMINDERS: readonly SeasonalRule[] = [
  {
    // First Friday of the year.
    matches: (d) => inWindow(d, 0, 1, 7),
    message: {
      title: "New year, new rank 🥂",
      body: "The climb to Top Shelf starts tonight.",
    },
  },
  {
    // The Friday nearest Valentine's Day.
    matches: (d) => inWindow(d, 1, 11, 17),
    message: {
      title: "Roses are red 🌹",
      body: "Martinis are clear — happy tini time, my dear.",
    },
  },
  {
    // First Friday of summer.
    matches: (d) => inWindow(d, 5, 20, 26),
    message: {
      title: "Patio season ☀️",
      body: "Patio + martini = correct.",
    },
  },
  {
    // Halloween week.
    matches: (d) => inWindow(d, 9, 25, 31),
    message: {
      title: "Something wicked 🎃",
      body: "This way pours.",
    },
  },
  {
    // (US) Thanksgiving week.
    matches: (d) => inWindow(d, 10, 22, 28),
    message: {
      title: "Giving thanks 🦃",
      body: "For cold gin and good company.",
    },
  },
  {
    // New Year's Eve week.
    matches: (d) => inWindow(d, 11, 26, 31),
    message: {
      title: "One last tini 🥂",
      body: "End the year Top Shelf style.",
    },
  },
];

const dayOfYear = (date: Date): number => {
  const start = new Date(date.getFullYear(), 0, 1);
  return (
    Math.floor((date.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1
  );
};

/** The message every member sees on a given Friday. */
export const reminderForDate = (fridayDate: Date): ReminderMessage => {
  const seasonal = SEASONAL_REMINDERS.find((rule) => rule.matches(fridayDate));
  if (seasonal) return seasonal.message;

  const week = Math.floor((dayOfYear(fridayDate) - 1) / 7);
  return EVERGREEN_REMINDERS[week % EVERGREEN_REMINDERS.length];
};

/** The next `count` Fridays at `hour` local time, starting after `from`. */
export const upcomingFridays = (
  from: Date,
  count: number,
  hour: number
): Date[] => {
  const fridays: Date[] = [];
  const cursor = new Date(from);
  cursor.setHours(hour, 0, 0, 0);
  // 5 = Friday in JS Date#getDay numbering.
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
