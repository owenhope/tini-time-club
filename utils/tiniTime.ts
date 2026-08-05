/**
 * The feed's rotating welcome block, grouped by weekday.
 *
 * The club's voice: sentence case, short display headlines, and a supporting
 * aside. The calendar week selects a variation, so the greeting stays stable
 * for the day without repeating on the same weekday for about three months.
 */

export interface TiniTimeGreeting {
  headline: string;
  subline: string;
}

/** Indexed by `Date.getDay()` - 0 is Sunday. */
export const GREETINGS_BY_DAY: readonly (readonly TiniTimeGreeting[])[] = [
  [
    {
      headline: "Sunday, slowly 🍸",
      subline: "One before the week starts asking questions.",
    },
    {
      headline: "Keep Sunday stirred",
      subline: "Tomorrow can wait until after the last olive.",
    },
    {
      headline: "A softer kind of Sunday",
      subline: "Low light, cold glass, nowhere urgent to be.",
    },
    {
      headline: "Sunday deserves a coupe",
      subline: "The weekend is not over until the glass says so.",
    },
    {
      headline: "One last weekend pour",
      subline: "Make the final hours count for something delicious.",
    },
    {
      headline: "Sunday service, chilled",
      subline: "A quiet bar is practically an invitation.",
    },
    {
      headline: "Take Sunday off-script",
      subline: "Order the one you usually talk yourself out of.",
    },
    {
      headline: "Easy does it, Sunday",
      subline: "A measured pour for an unmeasured afternoon.",
    },
    {
      headline: "The Sunday nightcap",
      subline: "Close the weekend with something properly cold.",
    },
    {
      headline: "Sunday has good taste",
      subline: "Follow its lead toward the nearest bar stool.",
    },
    {
      headline: "Stay out a little longer",
      subline: "Monday has never minded waiting its turn.",
    },
    {
      headline: "Sunday, no rush",
      subline: "There is still time for one worth remembering.",
    },
  ],
  [
    {
      headline: "Monday needs a martini",
      subline: "You've earned it and it's only just begun.",
    },
    {
      headline: "Make Monday less Monday",
      subline: "A cold coupe is a convincing change of subject.",
    },
    {
      headline: "Monday, meet your match",
      subline: "It comes chilled and usually with an olive.",
    },
    {
      headline: "Start the week stirred",
      subline: "Good decisions can still arrive after five.",
    },
    {
      headline: "Monday has an antidote",
      subline: "You already know which glass it comes in.",
    },
    {
      headline: "A better Monday awaits",
      subline: "Somewhere nearby, a bartender is polishing a coupe.",
    },
    {
      headline: "Clock out, olives in",
      subline: "The week can have you back tomorrow morning.",
    },
    {
      headline: "Monday, but make it cold",
      subline: "Nothing resets the tone like a proper first sip.",
    },
    {
      headline: "The week starts here",
      subline: "Preferably at the bar, not in your inbox.",
    },
    {
      headline: "Monday calls for backup",
      subline: "Gin, vodka, or whoever is buying the first round.",
    },
    {
      headline: "Give Monday a twist",
      subline: "It could use the personality.",
    },
    {
      headline: "First pour of the week",
      subline: "Set a standard the rest of the days can chase.",
    },
  ],
  [
    {
      headline: "Tuesday, quietly",
      subline: "The bar's emptier. The pour's more generous.",
    },
    {
      headline: "Tuesday knows a shortcut",
      subline: "Skip the crowd and head straight for the good seats.",
    },
    {
      headline: "A very good Tuesday",
      subline: "All it needs now is a very cold glass.",
    },
    {
      headline: "Tuesday, off the record",
      subline: "The best weeknight pours rarely need an audience.",
    },
    {
      headline: "Take Tuesday personally",
      subline: "Order exactly what you want, exactly how you want it.",
    },
    {
      headline: "Tuesday has potential",
      subline: "A bar stool and a twist should bring it out.",
    },
    {
      headline: "The quiet pour wins",
      subline: "No line, no fuss, no reason to head home yet.",
    },
    {
      headline: "Tuesday, well played",
      subline: "You found the night everyone else overlooked.",
    },
    {
      headline: "Claim your Tuesday seat",
      subline: "Regular status starts on nights like this.",
    },
    {
      headline: "Tuesday is for tasting",
      subline: "Try the house pour before the weekend finds it.",
    },
    {
      headline: "A little Tuesday polish",
      subline: "Add one chilled glass to improve the whole arrangement.",
    },
    {
      headline: "Tuesday, no occasion",
      subline: "Those are usually the drinks you remember best.",
    },
  ],
  [
    {
      headline: "Midweek, straight up",
      subline: "Wednesday is a fine night to be a regular.",
    },
    {
      headline: "Meet Wednesday halfway",
      subline: "Preferably somewhere with a chilled stem.",
    },
    {
      headline: "Halfway calls for olives",
      subline: "The weekend is visible from the right bar stool.",
    },
    {
      headline: "Wednesday, with a twist",
      subline: "The week needed a sharper ending anyway.",
    },
    {
      headline: "Midweek has its perks",
      subline: "Better seats, better chat, less shouting.",
    },
    {
      headline: "Break glass for Wednesday",
      subline: "Only the coupe, and only after work.",
    },
    {
      headline: "The middle deserves better",
      subline: "Trade the usual routine for the usual order.",
    },
    {
      headline: "Wednesday pours nicely",
      subline: "Especially when someone else is doing the stirring.",
    },
    {
      headline: "Your midweek reservation",
      subline: "One stool, one stem, one hour with no agenda.",
    },
    {
      headline: "Wednesday is listening",
      subline: "Tell it your order and leave out the rest.",
    },
    {
      headline: "Get over the hump chilled",
      subline: "A room-temperature victory hardly counts.",
    },
    {
      headline: "Midweek, made civilized",
      subline: "A proper drink can straighten out the whole calendar.",
    },
  ],
  [
    {
      headline: "Thursday's practice night",
      subline: "Warm up somewhere with a good stem.",
    },
    {
      headline: "Thursday starts the weekend",
      subline: "Friday can file the paperwork tomorrow.",
    },
    {
      headline: "Almost Friday, fully chilled",
      subline: "Close enough is good enough for the first round.",
    },
    {
      headline: "Thursday knows the way",
      subline: "Follow it past the office and toward the bar.",
    },
    {
      headline: "The soft launch of Friday",
      subline: "Same energy, better chance of getting a seat.",
    },
    {
      headline: "Thursday, make a move",
      subline: "Your favorite bar is not going to review itself.",
    },
    {
      headline: "One night ahead of schedule",
      subline: "The weekend rewards initiative.",
    },
    {
      headline: "Thursday has momentum",
      subline: "Point it toward somewhere that keeps the glasses cold.",
    },
    {
      headline: "Pre-weekend, properly",
      subline: "A rehearsal is only useful when you commit to it.",
    },
    {
      headline: "Thursday wants a round",
      subline: "It has been carrying this week long enough.",
    },
    {
      headline: "Dress rehearsal, extra dry",
      subline: "Tomorrow's crowd does not need to know you were here first.",
    },
    {
      headline: "Thursday earns the good gin",
      subline: "Save the sensible choices for the morning.",
    },
  ],
  [
    {
      headline: "It's tini time 🍸",
      subline: "Friday night and the shaker's calling.",
    },
    {
      headline: "Friday, finally chilled",
      subline: "The week ends better with condensation on the glass.",
    },
    {
      headline: "The weekend is served",
      subline: "Take the first sip before making any more plans.",
    },
    {
      headline: "Friday has entered the chat",
      subline: "It says to meet everyone at the bar.",
    },
    {
      headline: "Clock out, shake up",
      subline: "Your out-of-office deserves a proper garnish.",
    },
    {
      headline: "Friday wears a coupe",
      subline: "You should probably dress accordingly.",
    },
    {
      headline: "Cancel the sensible plan",
      subline: "The good bar has a seat with your name on it.",
    },
    {
      headline: "Pour decisions start now",
      subline: "At least make the first one photogenic.",
    },
    {
      headline: "Friday, make it dirty",
      subline: "The week was clean enough already.",
    },
    {
      headline: "Meet me at the good bar",
      subline: "You know the one, and so do your people.",
    },
    {
      headline: "The first round is calling",
      subline: "Answer before it goes to voicemail.",
    },
    {
      headline: "Friday looks better out",
      subline: "Find good lighting and an even better martini.",
    },
  ],
  [
    {
      headline: "Saturday, dressed up",
      subline: "Find a coupe with your name on it.",
    },
    {
      headline: "Saturday has plans",
      subline: "They begin with a reservation and end somewhere louder.",
    },
    {
      headline: "Your best glass is waiting",
      subline: "Go somewhere worthy of the outfit.",
    },
    {
      headline: "Saturday, take the long way",
      subline: "The next great martini might be one block over.",
    },
    {
      headline: "Tonight calls for a coupe",
      subline: "A regular glass simply will not do.",
    },
    {
      headline: "Saturday, no shortcuts",
      subline: "Good bars and great martinis are worth the detour.",
    },
    {
      headline: "Make tonight top shelf",
      subline: "You did not wait all week to order the safe thing.",
    },
    {
      headline: "The city is pouring",
      subline: "Pick a place and see who got there first.",
    },
    {
      headline: "Saturday in good spirits",
      subline: "Gin or vodka, the night can take it from here.",
    },
    {
      headline: "A night worth reviewing",
      subline: "Find the drink that earns all five olives.",
    },
    {
      headline: "Go where the Regulars go",
      subline: "They have already done the useful research.",
    },
    {
      headline: "Saturday, served cold",
      subline: "The warmer plans can wait until tomorrow.",
    },
  ],
] as const;

const DAY_MS = 24 * 60 * 60 * 1000;

/** A Sunday-based calendar week number built from local date components. */
const getCalendarWeek = (date: Date) => {
  const localDay = Math.floor(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / DAY_MS
  );
  return Math.floor((localDay + 4) / 7);
};

/** The greeting for a given day and calendar week; defaults to today. */
export const getTiniTimeGreeting = (date: Date = new Date()) => {
  const greetings = GREETINGS_BY_DAY[date.getDay()];
  const index =
    ((getCalendarWeek(date) % greetings.length) + greetings.length) %
    greetings.length;
  return greetings[index];
};

export default GREETINGS_BY_DAY;
