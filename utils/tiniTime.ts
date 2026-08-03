/**
 * The feed's welcome block, one for each day of the week.
 *
 * The club's voice: second person, sentence case, fragments, at most one
 * emoji and only at the end. The headline is set in the display cut, so it
 * stays lowercase and short enough not to wrap past two lines; the subline
 * is the aside that earns it.
 */

export interface TiniTimeGreeting {
  /** Lowercase display headline. */
  headline: string;
  /** One supporting line under it. */
  subline: string;
}

/** Indexed by `Date.getDay()` — 0 is Sunday. */
const GREETINGS: readonly TiniTimeGreeting[] = [
  {
    headline: "sunday, slowly 🍸",
    subline: "One before the week starts asking questions.",
  },
  {
    headline: "monday needs a martini",
    subline: "You've earned it and it's only just begun.",
  },
  {
    headline: "tuesday, quietly",
    subline: "The bar's emptier. The pour's more generous.",
  },
  {
    headline: "midweek, straight up",
    subline: "Wednesday is a fine night to be a regular.",
  },
  {
    headline: "thursday's practice night",
    subline: "Warm up somewhere with a good stem.",
  },
  {
    headline: "it's tini time 🍸",
    subline: "Friday night and the shaker's calling.",
  },
  {
    headline: "saturday, dressed up",
    subline: "Find a coupe with your name on it.",
  },
];

/** The greeting for a given day; defaults to today. */
export const getTiniTimeGreeting = (date: Date = new Date()) =>
  GREETINGS[date.getDay()];

export default GREETINGS;
