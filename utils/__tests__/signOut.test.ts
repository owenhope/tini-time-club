import { clearUserCaches } from "@/utils/signOut";
import authCache from "@/utils/authCache";
import imageCache from "@/utils/imageCache";
import databaseService from "@/services/databaseService";

jest.mock("@/utils/authCache", () => ({
  __esModule: true,
  default: { invalidateCache: jest.fn(() => Promise.resolve()) },
}));
jest.mock("@/utils/imageCache", () => ({
  __esModule: true,
  default: { clearCache: jest.fn(() => Promise.resolve()) },
}));
jest.mock("@/services/databaseService", () => ({
  __esModule: true,
  default: { clearAllCaches: jest.fn(() => Promise.resolve()) },
}));
jest.mock("@/utils/log", () => ({ log: jest.fn(), reportError: jest.fn() }));

describe("clearUserCaches", () => {
  beforeEach(() => jest.clearAllMocks());

  it("empties all three caches that hold member data", async () => {
    await clearUserCaches();
    expect(authCache.invalidateCache).toHaveBeenCalledTimes(1);
    expect(databaseService.clearAllCaches).toHaveBeenCalledTimes(1);
    expect(imageCache.clearCache).toHaveBeenCalledTimes(1);
  });

  it("still clears the others when one fails", async () => {
    (databaseService.clearAllCaches as jest.Mock).mockRejectedValueOnce(
      new Error("nope")
    );
    await expect(clearUserCaches()).resolves.toBeUndefined();
    expect(authCache.invalidateCache).toHaveBeenCalledTimes(1);
    expect(imageCache.clearCache).toHaveBeenCalledTimes(1);
  });
});
