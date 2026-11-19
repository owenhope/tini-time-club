import {
  detectHomeCity,
  searchCities,
  selectCity,
  saveHomeCity,
} from "../homeCityService";
import * as Location from "expo-location";
import { supabase } from "@/utils/supabase";
import AnalyticService from "@/services/analyticsService";

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  reverseGeocodeAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));
jest.mock("@/utils/locationUtils", () => ({ GOOGLE_MAPS_API_KEY: "test-key" }));
jest.mock("@/services/placesService", () => ({
  newSessionToken: () => "session",
}));
jest.mock("@/utils/supabase", () => ({ supabase: { rpc: jest.fn() } }));
jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));
jest.mock("@/services/passportService", () => ({
  decodePassportStamp: (value: unknown) => value,
}));
const fetchMock = jest.fn();
const originalFetch = global.fetch;
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock;
});
afterAll(() => {
  global.fetch = originalFetch;
});

it("restricts typeahead to cities and never sends a device location", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      suggestions: [
        {
          placePrediction: {
            placeId: "city-1",
            text: { text: "Vancouver, BC, Canada" },
          },
        },
      ],
    }),
  });
  expect(await searchCities("Vancouver", "session")).toEqual([
    { id: "city-1", label: "Vancouver, BC, Canada" },
  ]);
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
    input: "Vancouver",
    includedPrimaryTypes: ["(cities)"],
    sessionToken: "session",
  });
});
it("surfaces search failure instead of pretending there are no matches", async () => {
  fetchMock.mockResolvedValueOnce({ ok: false });
  await expect(searchCities("Vancouver", "session")).rejects.toThrow(
    "City search"
  );
});
it("resolves structured city information and excludes street details", async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      id: "city-1",
      addressComponents: [
        { longText: "Vancouver", types: ["locality"] },
        {
          longText: "British Columbia",
          types: ["administrative_area_level_1"],
        },
        { longText: "Canada", types: ["country"] },
        { longText: "Private street", types: ["route"] },
      ],
    }),
  });
  expect(await selectCity("city-1", "session")).toEqual({
    name: "Vancouver",
    region: "British Columbia",
    country: "Canada",
    place_id: "city-1",
    source: "manual",
  });
});
it("leaves manual selection available after permission denial", async () => {
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
    granted: false,
  } as Location.LocationPermissionResponse);
  await expect(detectHomeCity()).rejects.toThrow("choose your home city");
  expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  expect(AnalyticService.capture).toHaveBeenCalledWith(
    "home_city_permission_denied"
  );
});
it("stores only city fields from native reverse geocoding", async () => {
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
    granted: true,
  } as Location.LocationPermissionResponse);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue({
    coords: { latitude: 49, longitude: -123 },
  } as Location.LocationObject);
  jest.mocked(Location.reverseGeocodeAsync).mockResolvedValue([
    {
      city: "Vancouver",
      region: "BC",
      country: "Canada",
      street: "Private street",
    } as Location.LocationGeocodedAddress,
  ]);
  expect(await detectHomeCity()).toEqual({
    name: "Vancouver",
    region: "BC",
    country: "Canada",
    place_id: null,
    source: "device",
  });
});
it("records saves only after the owner-scoped RPC succeeds", async () => {
  jest
    .mocked(supabase.rpc)
    .mockResolvedValueOnce({ error: { message: "offline" } } as never);
  await expect(saveHomeCity(null, "profile")).rejects.toThrow("Couldn't save");
  expect(AnalyticService.capture).not.toHaveBeenCalled();
  jest
    .mocked(supabase.rpc)
    .mockResolvedValueOnce({ data: { unlocked: [] }, error: null } as never);
  await saveHomeCity(null, "profile");
  expect(supabase.rpc).toHaveBeenLastCalledWith("set_my_home_city_v1", {
    p_city: null,
  });
  expect(AnalyticService.capture).toHaveBeenCalledWith("home_city_removed");
});

it.each(["position", "geocoding"])(
  "replaces native %s errors with helpful copy",
  async (stage) => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({
      granted: true,
    } as Location.LocationPermissionResponse);
    const nativeError = new Error(
      "FunctionCallException: kCLErrorDomain error 0"
    );
    if (stage === "position") {
      jest
        .mocked(Location.getCurrentPositionAsync)
        .mockRejectedValueOnce(nativeError);
    } else {
      jest.mocked(Location.getCurrentPositionAsync).mockResolvedValueOnce({
        coords: { latitude: 49, longitude: -123 },
      } as Location.LocationObject);
      jest
        .mocked(Location.reverseGeocodeAsync)
        .mockRejectedValueOnce(nativeError);
    }
    await expect(detectHomeCity()).rejects.toThrow(
      "Couldn't find your location. Search for your city instead."
    );
  }
);
