#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(SCRIPT_DIR, "../..");
const ASSETS_DIR = join(SCRIPT_DIR, "assets");
const SEED_PREFIX = "screenshot_seed";
const LEGACY_SCREENSHOT_USERNAMES = [
  "screenshot_seed_stella",
  "screenshot_seed_maya",
  "screenshot_seed_lucas",
  "screenshot_seed_nina",
  "screenshot_seed_eli",
  "screenshot_seed_jules",
  "screenshot_seed_sasha",
  "screenshot_seed_toni",
];
const REVIEW_ID_START = 91_000_001;
const LOCATION_ID_START = 910_001;
const HERO_REVIEW_ID = REVIEW_ID_START;
const FEATURED_LOCATION_ID = LOCATION_ID_START;
const FIXED_START = new Date("2026-07-30T22:15:00.000Z");

const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const confirmed = args.has("--confirm-development");

const loadEnvLocal = () => {
  const envPath = join(REPO_ROOT, ".env.local");
  if (!existsSync(envPath)) return;

  const envFile = readFileSync(envPath, "utf8");
  for (const rawLine of envFile.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalsIndex = line.indexOf("=");
    if (equalsIndex === -1) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
};

loadEnvLocal();

const requireEnv = (name) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
};

const reviewAssets = Array.from(
  { length: 16 },
  (_, index) => `review-${String(index + 1).padStart(2, "0")}.jpg`
);

const users = [
  {
    key: "main",
    username: "stellavale",
    name: "Stella Vale",
    bio: "North Shore martini notes, best shared from a corner seat.",
    emailEnv: "SCREENSHOT_USER_EMAIL",
    passwordEnv: "SCREENSHOT_USER_PASSWORD",
    avatarAsset: "review-09.jpg",
    verified: true,
    favoriteSpirits: ["Gin"],
    favoriteTypes: ["Dirty"],
  },
  {
    key: "maya",
    username: "mayachen",
    name: "Maya Chen",
    bio: "A lemon twist loyalist.",
    avatarAsset: "review-11.jpg",
  },
  {
    key: "lucas",
    username: "lucasreed",
    name: "Lucas Reed",
    bio: "Here for the cold glass and the good booth.",
    avatarAsset: "review-12.jpg",
  },
  {
    key: "nina",
    username: "ninapark",
    name: "Nina Park",
    bio: "Olives, always.",
    avatarAsset: null,
  },
  {
    key: "eli",
    username: "elimorgan",
    name: "Eli Morgan",
    bio: "Tiny tables, strong opinions.",
    avatarAsset: "review-14.jpg",
  },
  {
    key: "jules",
    username: "julesmoreno",
    name: "Jules Moreno",
    bio: "Trying every house martini in the city.",
    avatarAsset: null,
  },
  {
    key: "sasha",
    username: "sashanoor",
    name: "Sasha Noor",
    bio: "Extra chilled, extra specific.",
    avatarAsset: "review-15.jpg",
  },
  {
    key: "toni",
    username: "toniblake",
    name: "Toni Blake",
    bio: "Bar snacks count as research.",
    avatarAsset: null,
  },
];

const venues = [
  {
    id: FEATURED_LOCATION_ID,
    key: "olive-room",
    name: "The Olive Room",
    address: "101 Lonsdale Avenue, North Vancouver, BC, Canada",
    lat: 49.3109,
    lon: -123.0812,
  },
  {
    id: LOCATION_ID_START + 1,
    key: "copper-coupe",
    name: "Copper Coupe",
    address: "138 Esplanade W, North Vancouver, BC, Canada",
    lat: 49.3102,
    lon: -123.0835,
  },
  {
    id: LOCATION_ID_START + 2,
    key: "night-jar",
    name: "Night Jar",
    address: "88 Carrie Cates Court, North Vancouver, BC, Canada",
    lat: 49.3091,
    lon: -123.0801,
  },
  {
    id: LOCATION_ID_START + 3,
    key: "gibson-house",
    name: "Gibson House",
    address: "171 1st Street E, North Vancouver, BC, Canada",
    lat: 49.3117,
    lon: -123.0774,
  },
  {
    id: LOCATION_ID_START + 4,
    key: "brine-and-stem",
    name: "Brine & Stem",
    address: "44 Lonsdale Avenue, North Vancouver, BC, Canada",
    lat: 49.3101,
    lon: -123.0798,
  },
  {
    id: LOCATION_ID_START + 5,
    key: "paper-plane",
    name: "Paper Plane",
    address: "221 Esplanade E, North Vancouver, BC, Canada",
    lat: 49.3096,
    lon: -123.0754,
  },
  {
    id: LOCATION_ID_START + 6,
    key: "juniper-step",
    name: "Juniper Step",
    address: "115 Victory Ship Way, North Vancouver, BC, Canada",
    lat: 49.3098,
    lon: -123.0791,
  },
  {
    id: LOCATION_ID_START + 7,
    key: "little-vesper",
    name: "Little Vesper",
    address: "74 2nd Street W, North Vancouver, BC, Canada",
    lat: 49.3126,
    lon: -123.0824,
  },
  {
    id: LOCATION_ID_START + 8,
    key: "corner-stir",
    name: "Corner Stir",
    address: "151 3rd Street W, North Vancouver, BC, Canada",
    lat: 49.3137,
    lon: -123.0848,
  },
  {
    id: LOCATION_ID_START + 9,
    key: "sage-and-salt",
    name: "Sage & Salt",
    address: "305 Lonsdale Avenue, North Vancouver, BC, Canada",
    lat: 49.3141,
    lon: -123.0789,
  },
  {
    id: LOCATION_ID_START + 10,
    key: "the-frosted-pick",
    name: "The Frosted Pick",
    address: "66 Wallace Mews, North Vancouver, BC, Canada",
    lat: 49.3077,
    lon: -123.0779,
  },
  {
    id: LOCATION_ID_START + 11,
    key: "harbour-no-3",
    name: "Harbour No. 3",
    address: "19 Chesterfield Place, North Vancouver, BC, Canada",
    lat: 49.3087,
    lon: -123.0841,
  },
];

const spiritNames = [
  "Gin",
  "Vodka",
  "Blanco Tequila",
  "Mezcal",
  "Bourbon",
  "Rye",
];
const typeNames = [
  "Dirty",
  "Dry",
  "Gibson",
  "Lemon Twist",
  "Espresso",
  "House",
];

const commentsByReviewId = {
  [HERO_REVIEW_ID]: [
    ["maya", "This one has main-character olive energy."],
    ["lucas", "Putting this on the Friday list."],
    ["nina", "Cold glass, good room, no notes."],
    ["eli", "Okay but that garnish is doing WORK."],
  ],
};

const captionBank = [
  "Tiny table, very serious little glass. Loved the briny finish.",
  "The first sip said relax, so I listened.",
  "Crisp, chilly, and just dramatic enough.",
  "A tiny bit savory, a tiny bit fancy, extremely my lane.",
  "The lemon twist was loud in the best way.",
  "Good booth, good lighting, great glass.",
  "This one disappeared suspiciously fast.",
  "Perfectly cold. Respectfully smug about it.",
  "Olive crew, please report here immediately.",
  "Clean, bright, and worth crossing Lonsdale for.",
  "A proper little after-work reset.",
  "The coupe was frosty enough to earn applause.",
  "Soft room, sharp drink. Great combo.",
  "Very friend-group-approved.",
  "Would absolutely order before reading the menu.",
  "Balanced enough to make me pause mid-story.",
  "A little salty, a little silky, very correct.",
  "Patio light made this feel extra golden.",
  "The garnish knew it was cute.",
  "I respect a martini that arrives this cold.",
  "Easy yes. Maybe too easy.",
  "Good first-date energy, if the date is the drink.",
  "Classic shape, playful finish.",
  "This is why I keep notes.",
];

const venuePlan = [
  {
    key: "olive-room",
    count: 10,
    scores: [
      [5, 5],
      [5, 5],
      [5, 5],
      [5, 5],
      [5, 5],
      [5, 4],
      [5, 4],
      [4, 5],
      [4, 5],
      [4, 4],
    ],
  },
  { key: "copper-coupe", count: 6 },
  { key: "night-jar", count: 6 },
  { key: "gibson-house", count: 6 },
  { key: "brine-and-stem", count: 6 },
  { key: "paper-plane", count: 6 },
  { key: "juniper-step", count: 6 },
  { key: "little-vesper", count: 6 },
  { key: "corner-stir", count: 5 },
  { key: "sage-and-salt", count: 5 },
  { key: "the-frosted-pick", count: 5 },
  { key: "harbour-no-3", count: 5 },
];

const mainProfileVenueOrder = [
  "olive-room",
  "copper-coupe",
  "night-jar",
  "gibson-house",
  "brine-and-stem",
  "paper-plane",
  "juniper-step",
  "little-vesper",
];

const supportingUserKeys = users
  .filter((user) => user.key !== "main")
  .map((user) => user.key);

const applyScreenshotRecency = (reviewRows) => {
  const priorityReviews = mainProfileVenueOrder
    .map((venueKey) =>
      reviewRows.find(
        (review) => review.userKey === "main" && review.venueKey === venueKey
      )
    )
    .filter(Boolean);
  const priorityReviewIds = new Set(priorityReviews.map((review) => review.id));
  const orderedReviews = [
    ...priorityReviews,
    ...reviewRows.filter((review) => !priorityReviewIds.has(review.id)),
  ];

  orderedReviews.forEach((review, recencyIndex) => {
    review.inserted_at = new Date(
      FIXED_START.getTime() - recencyIndex * 47 * 60 * 1000
    ).toISOString();
  });

  return reviewRows;
};

const makeReviews = () => {
  const reviews = [];
  let index = 0;

  for (const plan of venuePlan) {
    const venue = venues.find((item) => item.key === plan.key);
    if (!venue) throw new Error(`Unknown venue in plan: ${plan.key}`);

    for (let venueIndex = 0; venueIndex < plan.count; venueIndex += 1) {
      const id = REVIEW_ID_START + index;
      const supportKey = supportingUserKeys[index % supportingUserKeys.length];
      const userKey =
        venueIndex < Math.ceil(plan.count * 0.65) ? "main" : supportKey;
      const score =
        plan.scores?.[venueIndex] ??
        [
          [5, 4],
          [4, 5],
          [4, 4],
          [5, 5],
          [3, 4],
          [4, 3],
        ][index % 6];
      reviews.push({
        id,
        userKey,
        locationId: venue.id,
        venueKey: venue.key,
        imagePath: `${SEED_PREFIX}/reviews/${reviewAssets[index % reviewAssets.length]}`,
        asset: reviewAssets[index % reviewAssets.length],
        comment: captionBank[index % captionBank.length],
        inserted_at: null,
        typeName: typeNames[index % typeNames.length],
        spiritName: spiritNames[index % spiritNames.length],
        taste: score[0],
        presentation: score[1],
        state: 1,
      });
      index += 1;
    }
  }

  return applyScreenshotRecency(reviews);
};

const reviews = makeReviews();

const assertStaticPlan = () => {
  const assetFailures = reviewAssets
    .map((asset) => join(ASSETS_DIR, asset))
    .filter((path) => !existsSync(path));
  if (assetFailures.length > 0) {
    throw new Error(`Missing assets:\n${assetFailures.join("\n")}`);
  }
  if (!existsSync(join(ASSETS_DIR, "martini-contact-sheet.jpg"))) {
    throw new Error("Missing martini-contact-sheet.jpg");
  }
  if (venues.length !== 12)
    throw new Error(`Expected 12 venues, got ${venues.length}`);
  if (reviews.length !== 72) {
    throw new Error(`Expected 72 reviews, got ${reviews.length}`);
  }
  if (
    users[0].favoriteSpirits.length !== 1 ||
    users[0].favoriteTypes.length !== 1
  ) {
    throw new Error(
      "Main profile should have exactly one favorite spirit and type"
    );
  }
  const featuredReviews = reviews.filter(
    (review) => review.locationId === FEATURED_LOCATION_ID
  );
  const featuredAverage =
    featuredReviews.reduce(
      (sum, review) => sum + (review.taste + review.presentation) / 2,
      0
    ) / featuredReviews.length;
  if (Math.round(featuredAverage * 10) / 10 !== 4.7) {
    throw new Error(`Featured venue average is ${featuredAverage}, not 4.7`);
  }
  const mainVisibleGridReviews = reviews
    .filter((review) => review.userKey === "main")
    .sort((left, right) => right.inserted_at.localeCompare(left.inserted_at))
    .slice(0, 6);
  const mainVisibleGridVenueCount = new Set(
    mainVisibleGridReviews.map((review) => review.locationId)
  ).size;
  if (mainVisibleGridVenueCount !== 6) {
    throw new Error("Main profile grid should start with six distinct venues");
  }
  if ((commentsByReviewId[HERO_REVIEW_ID]?.length ?? 0) < 2) {
    throw new Error("Hero review needs at least two comments");
  }
};

const ensureDevelopmentGate = () => {
  if (process.env.BACKEND_ENV !== "development") {
    throw new Error("Refusing to seed unless BACKEND_ENV=development");
  }
  if (!confirmed) {
    throw new Error("Refusing to seed without --confirm-development");
  }
};

const getUserEmail = (user) => {
  if (user.emailEnv) return requireEnv(user.emailEnv);
  return `${user.username}@example.com`;
};

const getUserPassword = (user) => {
  if (user.passwordEnv) return requireEnv(user.passwordEnv);
  return `TiniSeed-${user.key}-2026!`;
};

const queryOrThrow = async (label, query) => {
  const { data, error } = await query;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
};

const findAuthUserByEmail = async (admin, email) => {
  let page = 1;
  const perPage = 1000;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`List auth users: ${error.message}`);
    const found = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    );
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
};

const ensureAuthUser = async (admin, user) => {
  const email = getUserEmail(user);
  const password = getUserPassword(user);
  const existing = await findAuthUserByEmail(admin, email);
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: {
        screenshot_seed: true,
        username: user.username,
        name: user.name,
      },
    });
    if (error) throw new Error(`Update auth user ${email}: ${error.message}`);
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      screenshot_seed: true,
      username: user.username,
      name: user.name,
    },
  });
  if (error) throw new Error(`Create auth user ${email}: ${error.message}`);
  return data.user;
};

const ensureLookupRows = async (admin, table, names) => {
  const rows = new Map();
  for (const name of names) {
    const existing = await queryOrThrow(
      `Find ${table}.${name}`,
      admin.from(table).select("id,name").eq("name", name).limit(1)
    );
    if (existing?.[0]) {
      rows.set(name, existing[0].id);
      continue;
    }
    const inserted = await queryOrThrow(
      `Insert ${table}.${name}`,
      admin.from(table).insert({ name }).select("id,name").single()
    );
    rows.set(name, inserted.id);
  }
  return rows;
};

const uploadAsset = async (admin, bucket, assetName, storagePath) => {
  const body = await readFile(join(ASSETS_DIR, assetName));
  const { error } = await admin.storage.from(bucket).upload(storagePath, body, {
    contentType: "image/jpeg",
    upsert: true,
  });
  if (error)
    throw new Error(`Upload ${bucket}/${storagePath}: ${error.message}`);
};

const ensureBucket = async (admin, bucketId, options) => {
  const { data, error } = await admin.storage.getBucket(bucketId);
  if (!error && data) return;

  const { error: createError } = await admin.storage.createBucket(
    bucketId,
    options
  );
  if (
    createError &&
    !createError.message?.toLowerCase().includes("already exists")
  ) {
    throw new Error(
      `Create storage bucket ${bucketId}: ${createError.message}`
    );
  }
};

const ensureStorageBuckets = async (admin) => {
  await ensureBucket(admin, "avatars", {
    public: true,
    allowedMimeTypes: ["image/jpeg", "image/png"],
  });
  await ensureBucket(admin, "review_images", {
    public: false,
    allowedMimeTypes: ["image/jpeg", "image/png"],
  });
};

const cleanupSeedData = async (admin, userIds) => {
  const reviewIds = reviews.map((review) => review.id);
  const locationIds = venues.map((venue) => venue.id);
  const [legacySeededProfiles, currentSeededProfiles] = await Promise.all([
    queryOrThrow(
      "Find legacy seed profiles",
      admin.from("profiles").select("id").like("username", `${SEED_PREFIX}_%`)
    ),
    queryOrThrow(
      "Find current seed profiles",
      admin
        .from("profiles")
        .select("id")
        .in(
          "username",
          users.map((user) => user.username)
        )
    ),
  ]);
  const seededProfiles = [
    ...(legacySeededProfiles ?? []),
    ...(currentSeededProfiles ?? []),
  ];
  const allSeedUserIds = [
    ...new Set([...userIds, ...(seededProfiles ?? []).map((row) => row.id)]),
  ];

  await queryOrThrow(
    "Delete seed likes",
    admin.from("likes").delete().in("review_id", reviewIds)
  );
  await queryOrThrow(
    "Delete seed user likes",
    admin.from("likes").delete().in("user_id", allSeedUserIds)
  );
  await queryOrThrow(
    "Delete seed comments",
    admin.from("comments").delete().in("review_id", reviewIds)
  );
  await queryOrThrow(
    "Delete seed user comments",
    admin.from("comments").delete().in("user_id", allSeedUserIds)
  );
  await queryOrThrow(
    "Delete seed followers by follower",
    admin.from("followers").delete().in("follower_id", allSeedUserIds)
  );
  await queryOrThrow(
    "Delete seed followers by following",
    admin.from("followers").delete().in("following_id", allSeedUserIds)
  );
  await queryOrThrow(
    "Delete seed reviews",
    admin.from("reviews").delete().in("id", reviewIds)
  );
  await queryOrThrow(
    "Delete seed user reviews",
    admin.from("reviews").delete().in("user_id", allSeedUserIds)
  );
  await queryOrThrow(
    "Clear favorite seeded locations",
    admin
      .from("profiles")
      .update({ favorite_location_id: null })
      .in("favorite_location_id", locationIds)
  );
  await queryOrThrow(
    "Delete seed locations",
    admin.from("locations").delete().in("id", locationIds)
  );
  await queryOrThrow(
    "Delete seed profiles",
    admin.from("profiles").delete().in("id", allSeedUserIds)
  );

  await admin.storage
    .from("review_images")
    .remove(reviewAssets.map((asset) => `${SEED_PREFIX}/reviews/${asset}`));
  await admin.storage
    .from("avatars")
    .remove([
      ...users
        .filter((user) => user.avatarAsset)
        .map((user) => `${SEED_PREFIX}/avatars/${user.username}.jpg`),
      ...LEGACY_SCREENSHOT_USERNAMES.map(
        (username) => `${SEED_PREFIX}/avatars/${username}.jpg`
      ),
    ]);
};

const validateSeed = async (admin) => {
  const [
    venueCount,
    reviewCount,
    heroReview,
    heroComments,
    profile,
    mapLocations,
    featuredRating,
  ] = await Promise.all([
    admin
      .from("locations")
      .select("*", { count: "exact", head: true })
      .like("place_id", `${SEED_PREFIX}:%`),
    admin
      .from("reviews")
      .select("*", { count: "exact", head: true })
      .gte("id", REVIEW_ID_START)
      .lte("id", REVIEW_ID_START + reviews.length - 1),
    admin
      .from("reviews")
      .select("id,state,image_url")
      .eq("id", HERO_REVIEW_ID)
      .single(),
    admin
      .from("comments")
      .select("*", { count: "exact", head: true })
      .eq("review_id", HERO_REVIEW_ID),
    admin
      .from("profiles")
      .select(
        "username,bio,favorite_spirits,favorite_types,favorite_location_id"
      )
      .eq("username", users[0].username)
      .single(),
    admin.rpc("locations_in_view", {
      min_lat: 49.303,
      min_long: -123.091,
      max_lat: 49.318,
      max_long: -123.07,
    }),
    admin
      .from("location_ratings")
      .select("rating,total_ratings")
      .eq("id", FEATURED_LOCATION_ID)
      .single(),
  ]);

  const failures = [];
  if (venueCount.error || venueCount.count !== 12) {
    failures.push(`Expected 12 venues, got ${venueCount.count ?? "error"}`);
  }
  if (reviewCount.error || reviewCount.count !== 72) {
    failures.push(`Expected 72 reviews, got ${reviewCount.count ?? "error"}`);
  }
  if (heroReview.error || heroReview.data?.state !== 1) {
    failures.push("Hero review is missing or unpublished");
  }
  if (heroComments.error || (heroComments.count ?? 0) < 4) {
    failures.push("Hero review needs four comments");
  }
  if (
    profile.error ||
    !profile.data?.bio ||
    !profile.data?.favorite_location_id ||
    (profile.data.favorite_spirits?.length ?? 0) !== 1 ||
    (profile.data.favorite_types?.length ?? 0) !== 1
  ) {
    failures.push("Main profile taste fields are incomplete");
  }
  if (mapLocations.error || (mapLocations.data?.length ?? 0) < 10) {
    failures.push("Map bounds do not return enough seeded venues");
  }
  if (
    featuredRating.error ||
    Number(featuredRating.data?.rating).toFixed(1) !== "4.7" ||
    Number(featuredRating.data?.total_ratings) !== 10
  ) {
    failures.push("Featured venue rating/count is not 4.7 from 10 reviews");
  }
  if (failures.length > 0) {
    throw new Error(`Seed validation failed:\n- ${failures.join("\n- ")}`);
  }
};

const run = async () => {
  assertStaticPlan();
  ensureDevelopmentGate();

  if (dryRun) {
    console.log("Dry run passed. Static screenshot seed plan is valid.");
    console.log("No Supabase connection was opened and no data was changed.");
    return;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? requireEnv("EXPO_PUBLIC_SUPABASE_URL");
  requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");
  const serviceRoleKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  await ensureStorageBuckets(admin);

  const authUsers = new Map();
  for (const user of users) {
    const authUser = await ensureAuthUser(admin, user);
    authUsers.set(user.key, authUser.id);
  }
  const userIds = [...authUsers.values()];

  await cleanupSeedData(admin, userIds);

  const [spiritIds, typeIds] = await Promise.all([
    ensureLookupRows(admin, "spirits", spiritNames),
    ensureLookupRows(admin, "types", typeNames),
    queryOrThrow(
      "Ensure published review state",
      admin.from("review_states").upsert({ id: 1, name: "published" })
    ),
  ]).then(([spirits, types]) => [spirits, types]);

  for (const asset of reviewAssets) {
    await uploadAsset(
      admin,
      "review_images",
      asset,
      `${SEED_PREFIX}/reviews/${asset}`
    );
  }

  for (const user of users) {
    if (user.avatarAsset) {
      await uploadAsset(
        admin,
        "avatars",
        user.avatarAsset,
        `${SEED_PREFIX}/avatars/${user.username}.jpg`
      );
    }
  }

  await queryOrThrow(
    "Upsert seed locations",
    admin.from("locations").upsert(
      venues.map((venue) => ({
        id: venue.id,
        name: venue.name,
        address: venue.address,
        created_by: authUsers.get("main"),
        place_id: `${SEED_PREFIX}:${venue.key}`,
        location: `SRID=4326;POINT(${venue.lon} ${venue.lat})`,
        inserted_at: "2026-07-27T18:00:00.000Z",
      }))
    )
  );

  await queryOrThrow(
    "Upsert seed profiles",
    admin.from("profiles").upsert(
      users.map((user) => ({
        id: authUsers.get(user.key),
        username: user.username,
        name: user.name,
        bio: user.bio,
        avatar_url: user.avatarAsset
          ? `${SEED_PREFIX}/avatars/${user.username}.jpg`
          : null,
        is_verified: user.verified ?? false,
        eula_accepted: true,
        eula_accepted_at: "2026-07-27T18:00:00.000Z",
        deleted: false,
        deleted_at: null,
        favorite_location_id: user.key === "main" ? FEATURED_LOCATION_ID : null,
        favorite_spirits:
          user.key === "main"
            ? user.favoriteSpirits.map((name) => spiritIds.get(name))
            : [],
        favorite_types:
          user.key === "main"
            ? user.favoriteTypes.map((name) => typeIds.get(name))
            : [],
      }))
    )
  );

  await queryOrThrow(
    "Upsert seed reviews",
    admin.from("reviews").upsert(
      reviews.map((review) => ({
        id: review.id,
        user_id: authUsers.get(review.userKey),
        image_url: review.imagePath,
        comment: review.comment,
        inserted_at: review.inserted_at,
        type: typeIds.get(review.typeName),
        spirit: spiritIds.get(review.spiritName),
        location: review.locationId,
        taste: review.taste,
        presentation: review.presentation,
        state: review.state,
      }))
    )
  );

  const comments = Object.entries(commentsByReviewId).flatMap(
    ([reviewId, entries]) =>
      entries.map(([userKey, body], index) => ({
        review_id: Number(reviewId),
        user_id: authUsers.get(userKey),
        body,
        inserted_at: new Date(
          FIXED_START.getTime() + (index + 1) * 8 * 60 * 1000
        ).toISOString(),
      }))
  );
  await queryOrThrow(
    "Insert hero comments",
    admin.from("comments").insert(comments)
  );

  const likeRows = [];
  for (const review of reviews.slice(0, 18)) {
    for (const userKey of supportingUserKeys.slice(0, (review.id % 4) + 2)) {
      likeRows.push({
        review_id: review.id,
        user_id: authUsers.get(userKey),
        liked_at: "2026-07-31T03:00:00.000Z",
      });
    }
  }
  await queryOrThrow("Insert seed likes", admin.from("likes").insert(likeRows));

  const followRows = [
    ["maya", "main"],
    ["lucas", "main"],
    ["nina", "main"],
    ["eli", "main"],
    ["main", "maya"],
    ["main", "lucas"],
    ["main", "sasha"],
    ["jules", "main"],
    ["toni", "main"],
  ].map(([follower, following]) => ({
    follower_id: authUsers.get(follower),
    following_id: authUsers.get(following),
    followed_at: "2026-07-29T17:00:00.000Z",
  }));
  await queryOrThrow(
    "Insert seed followers",
    admin.from("followers").insert(followRows)
  );

  await validateSeed(admin);

  console.log("Seed complete.");
  console.log(`Hero review: ${HERO_REVIEW_ID}`);
  console.log(`Featured location: ${FEATURED_LOCATION_ID}`);
  console.log(`Main username: ${users[0].username}`);
};

run().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
