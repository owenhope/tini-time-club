const mockStorage = new Map<string, string>();
const mockIsAvailable = jest.fn(async () => true);
const mockRequestReview = jest.fn(async () => undefined);
let mockNativeModulePresent = true;

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (key: string) => mockStorage.get(key) ?? null),
    setItem: jest.fn(async (key: string, value: string) => {
      mockStorage.set(key, value);
    }),
  },
}));
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { expoConfig: { version: "4.10.0" } },
}));
jest.mock("expo-modules-core", () => ({
  ...jest.requireActual("expo-modules-core"),
  requireOptionalNativeModule: (name: string) => {
    if (name === "ExpoStoreReview") return mockNativeModulePresent ? {} : null;
    return jest
      .requireActual("expo-modules-core")
      .requireOptionalNativeModule(name);
  },
}));
jest.mock("expo-store-review", () => ({
  isAvailableAsync: () => mockIsAvailable(),
  requestReview: () => mockRequestReview(),
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));

import {
  countOpenDay,
  isEligibleForRatingPrompt,
  maybeRequestRating,
  PROMPT_COOLDOWN_MS,
  recordAppOpenDay,
  resetRatingPromptForTests,
  type RatingPromptState,
} from "@/services/ratingPrompt";

const NOW = new Date(2026, 10, 4, 18, 0, 0);
const base: RatingPromptState = {
  openDayCount: 0,
  lastOpenDay: null,
  lastPromptAt: null,
  lastPromptVersion: null,
};

beforeEach(() => {
  mockStorage.clear();
  jest.clearAllMocks();
  mockNativeModulePresent = true;
  resetRatingPromptForTests();
});

describe("isEligibleForRatingPrompt", () => {
  it("asks posters from their second review", () => {
    const first = { kind: "posted-review", postedReviewCount: 1 } as const;
    const second = { kind: "posted-review", postedReviewCount: 2 } as const;
    expect(isEligibleForRatingPrompt(base, first, "4.10.0", NOW)).toBe(false);
    expect(isEligibleForRatingPrompt(base, second, "4.10.0", NOW)).toBe(true);
  });

  it("asks readers only after four separate days in the app", () => {
    const engagement = { kind: "engagement" } as const;
    expect(
      isEligibleForRatingPrompt(
        { ...base, openDayCount: 3 },
        engagement,
        "4.10.0",
        NOW
      )
    ).toBe(false);
    expect(
      isEligibleForRatingPrompt(
        { ...base, openDayCount: 4 },
        engagement,
        "4.10.0",
        NOW
      )
    ).toBe(true);
  });

  it("asks at most once per app version", () => {
    const state = {
      ...base,
      lastPromptAt: new Date(
        NOW.getTime() - 2 * PROMPT_COOLDOWN_MS
      ).toISOString(),
      lastPromptVersion: "4.10.0",
    };
    const trigger = { kind: "posted-review", postedReviewCount: 5 } as const;
    expect(isEligibleForRatingPrompt(state, trigger, "4.10.0", NOW)).toBe(
      false
    );
    expect(isEligibleForRatingPrompt(state, trigger, "4.11.0", NOW)).toBe(true);
  });

  it("waits out the cooldown even after an app update", () => {
    const state = {
      ...base,
      lastPromptAt: new Date(
        NOW.getTime() - PROMPT_COOLDOWN_MS + 1
      ).toISOString(),
      lastPromptVersion: "4.10.0",
    };
    const trigger = { kind: "posted-review", postedReviewCount: 5 } as const;
    expect(isEligibleForRatingPrompt(state, trigger, "4.11.0", NOW)).toBe(
      false
    );
  });
});

describe("countOpenDay", () => {
  it("counts each local calendar day once", () => {
    const day1 = countOpenDay(base, NOW);
    const sameDay = countOpenDay(day1, new Date(2026, 10, 4, 23, 59));
    const day2 = countOpenDay(sameDay, new Date(2026, 10, 5, 0, 1));
    expect(day1.openDayCount).toBe(1);
    expect(sameDay).toBe(day1);
    expect(day2.openDayCount).toBe(2);
  });
});

describe("maybeRequestRating", () => {
  const second = { kind: "posted-review", postedReviewCount: 2 } as const;

  it("shows the system prompt once, then holds off for the version", async () => {
    await expect(
      maybeRequestRating(second, { delayMs: 0, now: () => NOW })
    ).resolves.toBe(true);
    await expect(
      maybeRequestRating(second, { delayMs: 0, now: () => NOW })
    ).resolves.toBe(false);
    expect(mockRequestReview).toHaveBeenCalledTimes(1);
  });

  it("does nothing in builds without the native module", async () => {
    mockNativeModulePresent = false;
    await expect(
      maybeRequestRating(second, { delayMs: 0, now: () => NOW })
    ).resolves.toBe(false);
    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("does nothing where the store prompt is unavailable", async () => {
    mockIsAvailable.mockResolvedValueOnce(false);
    await expect(
      maybeRequestRating(second, { delayMs: 0, now: () => NOW })
    ).resolves.toBe(false);
    expect(mockRequestReview).not.toHaveBeenCalled();
  });

  it("lets readers qualify through recorded open days", async () => {
    const engagement = { kind: "engagement" } as const;
    for (const day of [1, 2, 3]) {
      await recordAppOpenDay(new Date(2026, 10, day, 12));
    }
    await expect(
      maybeRequestRating(engagement, { delayMs: 0, now: () => NOW })
    ).resolves.toBe(false);
    await recordAppOpenDay(NOW);
    await expect(
      maybeRequestRating(engagement, { delayMs: 0, now: () => NOW })
    ).resolves.toBe(true);
  });
});
