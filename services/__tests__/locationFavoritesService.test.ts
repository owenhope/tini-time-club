import AnalyticService from "@/services/analyticsService";
import {
  getLocationFavorite,
  getProfileFavorites,
  setLocationFavorite,
} from "../locationFavoritesService";

jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn(async () => true) },
}));

const mockRpc = jest.fn();
const mockPassport = jest.fn();
jest.mock("@/utils/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock("@/services/passportService", () => ({
  getMyPassport: () => mockPassport(),
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));
beforeEach(() => {
  jest.mocked(AnalyticService.capture).mockClear();
  mockRpc.mockReset();
  mockPassport.mockReset().mockResolvedValue({});
});

it("saves an explicit state without allowing a caller-supplied member identity", async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });
  expect(await setLocationFavorite(42, true)).toBe(true);
  expect(mockRpc).toHaveBeenCalledWith("set_location_favorite", {
    p_location_id: "42",
    p_saved: true,
  });
  expect(mockPassport).toHaveBeenCalledTimes(1);
  expect(AnalyticService.capture).toHaveBeenCalledWith("favorite_saved");
});
it("does not turn a Passport refresh failure into a failed save", async () => {
  mockRpc.mockResolvedValue({ data: true, error: null });
  mockPassport.mockRejectedValue(new Error("offline"));
  expect(await setLocationFavorite(42, true)).toBe(true);
});
it("propagates failed writes and unknown status instead of guessing", async () => {
  mockRpc.mockResolvedValue({ data: null, error: new Error("denied") });
  await expect(setLocationFavorite(42, true)).rejects.toThrow("denied");
  expect(mockPassport).not.toHaveBeenCalled();
  expect(AnalyticService.capture).not.toHaveBeenCalled();
  mockRpc.mockResolvedValue({ data: null, error: null });
  await expect(getLocationFavorite(42)).rejects.toThrow("unavailable");
});
it("uses the last visible item as the cursor and keeps the lookahead for the next page", async () => {
  mockRpc.mockResolvedValue({
    data: Array.from({ length: 31 }, (_, i) => ({
      location_id: 100 - i,
      location_name: `Venue ${i}`,
      saved_at: "2026-10-18T00:00:00Z",
    })),
    error: null,
  });
  const page = await getProfileFavorites("member");
  expect(page.items).toHaveLength(30);
  expect(page.cursor).toEqual({
    locationId: 71,
    savedAt: "2026-10-18T00:00:00Z",
  });
  mockRpc.mockResolvedValue({ data: [], error: null });
  await getProfileFavorites("member", page.cursor);
  expect(mockRpc).toHaveBeenLastCalledWith("get_profile_favorites", {
    p_profile_id: "member",
    p_before_id: 71,
    p_before_time: "2026-10-18T00:00:00Z",
  });
});
