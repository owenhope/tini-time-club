export const MARTINI_SPIRITS = ["Gin", "Vodka", "Vesper"] as const;
export const MARTINI_TYPES = [
  "Classic",
  "Dry",
  "50/50",
  "Twist",
  "Dirty",
  "Filthy",
  "Espresso",
] as const;

export type MartiniSpirit = (typeof MARTINI_SPIRITS)[number];
export type MartiniType = (typeof MARTINI_TYPES)[number];

export interface MartiniIndexEntry {
  id: string;
  title: string;
  spirit: MartiniSpirit;
  type: MartiniType;
  image: number;
  description: string;
  ingredients: string;
  order: string;
  badge: "IBA official" | "Bar classic" | "Club pick";
}

export interface MartiniGuideNote {
  id: string;
  title: string;
  body: string;
  closer: string;
}

export type MartiniIndexRow =
  | { kind: "drink"; id: string; item: MartiniIndexEntry }
  | { kind: "guide"; id: string; item: MartiniGuideNote };

export const MARTINI_GUIDE_NOTES: MartiniGuideNote[] = [
  {
    id: "shaken-or-stirred",
    title: "Shaken or stirred?",
    body: "Stirring keeps a spirit-forward Martini clear and silky. Shaking chills and dilutes it faster, adding tiny air bubbles and a livelier texture.",
    closer: "Bond chose drama. You can choose texture.",
  },
  {
    id: "neat-vs-up",
    title: "Neat vs. up?",
    body: "“Up” means chilled with ice, then strained into a stemmed glass without ice. “Neat” means poured directly from the bottle without chilling, ice, or added dilution.",
    closer: "Both skip cubes. Only one had an ice bath.",
  },
  {
    id: "dry-wet-fifty-fifty",
    title: "Dry, wet, or 50/50?",
    body: "Dry means less dry vermouth. Wet means more. A 50/50 divides the pour equally between spirit and dry vermouth.",
    closer: "“Wet” is more vermouth, not a tiny swimming pool.",
  },
  {
    id: "dirty-to-filthy",
    title: "Dirty, extra-dirty, filthy?",
    body: "They all add olive brine. Each step asks for more, but the exact pour varies by bar, so say how briny you want it.",
    closer: "Filthy is a preference, not an accusation.",
  },
  {
    id: "twist-or-olive",
    title: "Twist or olive?",
    body: "A twist is a strip of citrus peel expressed over the drink, adding fragrant oils and brightness. An olive brings a savory, salty finish.",
    closer: "Perfume or snack. Choose your accessory.",
  },
];

/**
 * The index deliberately stays inside the review composer's supported
 * spirit/type vocabulary. Popularity and specs were checked against the IBA
 * official list plus established bartender references for Dirty and 50/50.
 */
export const MARTINI_INDEX: MartiniIndexEntry[] = [
  {
    id: "classic-gin",
    title: "Gin Martini",
    spirit: "Gin",
    type: "Classic",
    image: require("@/assets/images/index/classic-gin.jpg"),
    description:
      "Dry vermouth softens the juniper and botanicals while keeping the drink crisp and spirit-forward; an olive adds a savory finish.",
    ingredients: "Gin · Dry Vermouth · Olive",
    order: "A gin martini with an olive.",
    badge: "Bar classic",
  },
  {
    id: "classic-vodka",
    title: "Vodka Martini",
    spirit: "Vodka",
    type: "Classic",
    image: require("@/assets/images/index/classic-vodka.jpg"),
    description:
      "Dry vermouth adds gentle herbal structure to an otherwise clean, neutral pour. Smooth and spirit-forward, with a savory olive finish.",
    ingredients: "Vodka · Dry Vermouth · Olives",
    order: "A vodka martini with olives.",
    badge: "Bar classic",
  },
  {
    id: "dry-gin",
    title: "Dry Gin Martini",
    spirit: "Gin",
    type: "Dry",
    image: require("@/assets/images/index/dry-gin.jpg"),
    description:
      "Less dry vermouth puts juniper and botanicals firmly in front. Crisp, strong, and noticeably drier than the standard build.",
    ingredients: "Gin · A Little Dry Vermouth · Olive",
    order: "A dry gin martini with an olive.",
    badge: "IBA official",
  },
  {
    id: "dry-vodka",
    title: "Dry Vodka Martini",
    spirit: "Vodka",
    type: "Dry",
    image: require("@/assets/images/index/dry-vodka.jpg"),
    description:
      "Only a small measure of dry vermouth rounds out the clean, neutral base. Strong, smooth, and especially spirit-forward.",
    ingredients: "Vodka · A Little Dry Vermouth · Olive",
    order: "A dry vodka martini with an olive.",
    badge: "Club pick",
  },
  {
    id: "fifty-fifty-gin",
    title: "50/50 Martini",
    spirit: "Gin",
    type: "50/50",
    image: require("@/assets/images/index/fifty-fifty-gin.jpg"),
    description:
      "Equal parts gin and dry vermouth create a lighter, more aromatic pour with herbal depth and a softer finish.",
    ingredients: "Equal Parts Gin And Dry Vermouth · Lemon Twist",
    order: "A 50/50 gin martini with a twist.",
    badge: "Bar classic",
  },
  {
    id: "gin-twist",
    title: "Gin Martini with a Twist",
    spirit: "Gin",
    type: "Twist",
    image: require("@/assets/images/index/gin-twist.jpg"),
    description:
      "Expressed lemon peel replaces the olive, lifting the botanicals with bright citrus aroma without adding juice.",
    ingredients: "Gin · Dry Vermouth · Expressed Lemon Peel",
    order: "A gin martini with a twist.",
    badge: "Bar classic",
  },
  {
    id: "vodka-twist",
    title: "Vodka Martini with a Twist",
    spirit: "Vodka",
    type: "Twist",
    image: require("@/assets/images/index/vodka-twist.jpg"),
    description:
      "Expressed lemon peel adds bright citrus aroma to a clean, neutral base while keeping the drink crisp and dry.",
    ingredients: "Vodka · Dry Vermouth · Expressed Lemon Peel",
    order: "A vodka martini with a twist.",
    badge: "Club pick",
  },
  {
    id: "dirty-gin",
    title: "Dirty Gin Martini",
    spirit: "Gin",
    type: "Dirty",
    image: require("@/assets/images/index/dirty-gin.jpg"),
    description:
      "Olive brine balances juniper and dry vermouth with a savory, salty edge. Briny without burying the botanicals.",
    ingredients: "Gin · Dry Vermouth · Olive Brine · Olives",
    order: "A dirty gin martini with olives.",
    badge: "Bar classic",
  },
  {
    id: "dirty-vodka",
    title: "Dirty Vodka Martini",
    spirit: "Vodka",
    type: "Dirty",
    image: require("@/assets/images/index/dirty-vodka.jpg"),
    description:
      "Olive brine adds a smooth, savory, saline character, while the neutral base keeps the olive flavor front and center.",
    ingredients: "Vodka · Dry Vermouth · Olive Brine · Olives",
    order: "A dirty vodka martini with olives.",
    badge: "Bar classic",
  },
  {
    id: "filthy-vodka",
    title: "Filthy Vodka Martini",
    spirit: "Vodka",
    type: "Filthy",
    image: require("@/assets/images/index/filthy-vodka.jpg"),
    description:
      "Extra olive brine and olives make this saltier and more savory than a standard Dirty. Unapologetically olive-forward.",
    ingredients: "Vodka · Extra Olive Brine · An Unreasonable Olive Count",
    order: "A filthy vodka martini, extra brine, extra olives.",
    badge: "Club pick",
  },
  {
    id: "espresso-vodka",
    title: "Espresso Martini",
    spirit: "Vodka",
    type: "Espresso",
    image: require("@/assets/images/index/espresso-vodka.jpg"),
    description:
      "Vodka, espresso, coffee liqueur, and sugar are shaken into a cold, foamy cocktail. Rich, bittersweet, and caffeinated.",
    ingredients: "Vodka · Espresso · Coffee Liqueur · Sugar",
    order: "An espresso martini with vodka.",
    badge: "IBA official",
  },
  {
    id: "vesper",
    title: "Vesper Martini",
    spirit: "Vesper",
    type: "Classic",
    image: require("@/assets/images/index/vesper.jpg"),
    description:
      "Gin, vodka, and Lillet Blanc combine into a strong, aromatic pour with citrus and floral notes. Traditionally shaken and finished with lemon.",
    ingredients: "Gin · Vodka · Lillet Blanc · Lemon Zest",
    order: "A Vesper, very cold, with a twist.",
    badge: "IBA official",
  },
];

export interface MartiniAvoidances {
  spirits: readonly MartiniSpirit[];
  types: readonly MartiniType[];
}

export const filterMartiniIndex = (
  query: string,
  spirit: MartiniSpirit | "All" = "All"
) => {
  const needle = query.trim().toLowerCase();
  return MARTINI_INDEX.filter((item) => {
    const matchesSpirit = spirit === "All" || item.spirit === spirit;
    const matchesQuery =
      !needle ||
      [item.title, item.spirit, item.type, item.description, item.ingredients]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    return matchesSpirit && matchesQuery;
  });
};

const GUIDE_AFTER_DRINK_INDEX = new Map([
  [1, MARTINI_GUIDE_NOTES[0]],
  [4, MARTINI_GUIDE_NOTES[1]],
  [6, MARTINI_GUIDE_NOTES[4]],
  [7, MARTINI_GUIDE_NOTES[2]],
  [9, MARTINI_GUIDE_NOTES[3]],
]);

export const getMartiniIndexRows = (
  spirit: MartiniSpirit | "All" = "All"
): MartiniIndexRow[] => {
  const drinks = filterMartiniIndex("", spirit);
  if (spirit !== "All") {
    return drinks.map((item) => ({ kind: "drink", id: item.id, item }));
  }

  return drinks.flatMap((item, index): MartiniIndexRow[] => {
    const drink: MartiniIndexRow = { kind: "drink", id: item.id, item };
    const guide = GUIDE_AFTER_DRINK_INDEX.get(index);
    return guide
      ? [drink, { kind: "guide", id: `guide-${guide.id}`, item: guide }]
      : [drink];
  });
};

export const getEligibleMartinis = (avoidances: MartiniAvoidances) =>
  MARTINI_INDEX.filter(
    (item) =>
      !avoidances.spirits.includes(item.spirit) &&
      !avoidances.types.includes(item.type)
  );

export const pickMartiniIndexEntry = (
  avoidances: MartiniAvoidances,
  previousId?: string | null,
  random: () => number = Math.random
): MartiniIndexEntry | null => {
  const eligible = getEligibleMartinis(avoidances);
  if (eligible.length === 0) return null;

  const withoutPrevious = eligible.filter((item) => item.id !== previousId);
  const pool = withoutPrevious.length > 0 ? withoutPrevious : eligible;
  const index = Math.min(Math.floor(random() * pool.length), pool.length - 1);
  return pool[index];
};
