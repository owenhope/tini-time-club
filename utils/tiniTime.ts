/**
 * The feed's welcome block, one for each day of the week.
 *
 * The club's voice: second person, sentence case, fragments, at most one
 * emoji and only at the end. The headline is set in the display cut, so it
 * stays short enough not to wrap past two lines; the subline
 * is the aside that earns it.
 */

export interface TiniTimeGreeting {
  /** Sentence-case display headline. */
  headline: string;
  /** One supporting line under it. */
  subline: string;
}

/** Indexed by `Date.getDay()` — 0 is Sunday. */
const GREETINGS: readonly TiniTimeGreeting[] = [
  {
    headline: "Sunday, slowly 🍸",
    subline: "One before the week starts asking questions.",
  },
  {
    headline: "Monday needs a martini",
    subline: "You've earned it and it's only just begun.",
  },
  {
    headline: "Tuesday, quietly",
    subline: "The bar's emptier. The pour's more generous.",
  },
  {
    headline: "Midweek, straight up",
    subline: "Wednesday is a fine night to be a regular.",
  },
  {
    headline: "Thursday's practice night",
    subline: "Warm up somewhere with a good stem.",
  },
  {
    headline: "It's tini time 🍸",
    subline: "Friday night and the shaker's calling.",
  },
  {
    headline: "Saturday, dressed up",
    subline: "Find a coupe with your name on it.",
  },
];

/** The greeting for a given day; defaults to today. */
export const getTiniTimeGreeting = (date: Date = new Date()) =>
  GREETINGS[date.getDay()];

export default GREETINGS;
