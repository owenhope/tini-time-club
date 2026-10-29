import React from "react";
import { StyleSheet } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import ExploreMap from "@/components/explore/ExploreMap";
import type { ExploreRegion } from "@/services/regionService";

const mockRpc = jest.fn();
const mockPublicViewport = jest.fn();
const mockRegulars = jest.fn();
const mockMember = { id: "member" };
let mockSignedIn = true;
let mockFavoriteIds: ReadonlySet<string> = new Set();

jest.mock("@/utils/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
jest.mock("@/services/public-content-service", () => ({
  publicContentService: {
    getLocationsInView: (...args: unknown[]) => mockPublicViewport(...args),
  },
}));
jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: mockSignedIn ? mockMember : null }),
}));
jest.mock("@/hooks/useFavoriteLocationIds", () => ({
  useFavoriteLocationIds: () => mockFavoriteIds,
}));
jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({ requireMembership: () => true }),
}));
jest.mock("@/services/regularsService", () => ({
  withRegulars: (locations: unknown[]) => mockRegulars(locations),
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));
jest.mock("@/utils/screenshotMode", () => ({ getScreenshotSeed: () => null }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock("@/theme", () => {
  const tokens = jest.requireActual("@/theme/tokens");
  const theme = {
    colors: tokens.lightColors,
    spacing: tokens.spacing,
    radius: tokens.radius,
    typography: tokens.typography,
    elevation: tokens.elevation.light,
    isDark: false,
  };
  return {
    makeStyles: (factory: (t: typeof theme) => unknown) => () => factory(theme),
    useTheme: () => theme,
  };
});
jest.mock("@/components/map/ClusteredMap", () => "MapView");
jest.mock("react-native-maps", () => ({ Marker: "Marker" }));
jest.mock("@gorhom/bottom-sheet", () => ({
  __esModule: true,
  default: "BottomSheet",
  BottomSheetView: "BottomSheetView",
}));
jest.mock("@/components/map/locationPin", () => "LocationPin");
jest.mock("@/components/map/locationDetails", () => "LocationDetails");
jest.mock("@/components/map/search", () => "Search");
jest.mock("@/components/RegularsSlider", () => "RegularsSlider");
jest.mock("@/components/explore/ExploreSearchField", () => ({
  ExploreSearchArea: "ExploreSearchArea",
}));

const whistler: ExploreRegion = {
  id: 1,
  slug: "whistler",
  name: "Whistler",
  displayOrder: 0,
  center: { latitude: 50.12, longitude: -122.96 },
  catchmentRadiusMeters: 20_000,
};
const vancouver = {
  latitude: 49.28,
  longitude: -123.12,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};
const venues = [
  {
    id: 1,
    name: "Whistler bar",
    lat: 50.12,
    long: -122.96,
    is_golden_glass: false,
  },
  {
    id: 2,
    name: "Vancouver bar",
    lat: 49.28,
    long: -123.12,
    is_golden_glass: false,
  },
];

// Model the backend's viewport and optional region predicates so restoring the
// old region-scoped request actually removes Vancouver's pin from this test.
function inView(minLat: number, maxLat: number, regionId?: number) {
  return venues.filter(
    (venue) =>
      venue.lat >= minLat &&
      venue.lat <= maxLat &&
      (regionId == null || venue.id === regionId)
  );
}

describe("Explore map viewport discovery", () => {
  let renderer: ReactTestRenderer;
  const map = () => renderer.root.findByType("MapView" as React.ElementType);
  const pinNames = () =>
    renderer.root
      .findAllByType("LocationPin" as React.ElementType)
      .map((pin) => pin.props.loc.name);
  const settle = async () => {
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
  };

  beforeEach(() => {
    jest.useFakeTimers();
    mockRegulars.mockReset().mockImplementation(async (locations) => locations);
    mockRpc.mockReset().mockImplementation(async (rpc, args) => ({
      data:
        rpc === "locations_in_view"
          ? inView(args.min_lat, args.max_lat)
          : inView(args.p_min_lat, args.p_max_lat, args.p_region_id),
      error: null,
    }));
    mockPublicViewport
      .mockReset()
      .mockImplementation(async (args) =>
        inView(args.minLat, args.maxLat, args.regionId)
      );
  });

  afterEach(() => {
    act(() => renderer?.unmount());
    jest.useRealTimers();
    mockFavoriteIds = new Set();
  });

  it("draws a liked place's pin pink", async () => {
    mockSignedIn = true;
    mockFavoriteIds = new Set(["2"]);
    await act(async () => {
      renderer = create(
        <ExploreMap
          enabled
          focus={{}}
          location={{
            status: "denied",
            coordinates: null,
            canOpenSettings: false,
          }}
          requestLocation={async () => undefined}
          exploreRegion={whistler}
          searchVisible={false}
        />
      );
    });
    await settle();
    act(() => map().props.onRegionChangeComplete(vancouver));
    await settle();

    const pinFor = (name: string) =>
      renderer.root
        .findAllByType("LocationPin" as React.ElementType)
        .find((pin) => pin.props.loc.name === name);
    expect(pinFor("Vancouver bar")?.props.favorite).toBe(true);
    // The map clusters for itself; the library's own clustering stays off.
    expect(map().props.clusteringEnabled).toBe(false);
  });

  it.each([true, false])(
    "loads Vancouver after another pan interrupts enrichment (signed in: %s)",
    async (signedIn) => {
      mockSignedIn = signedIn;
      await act(async () => {
        renderer = create(
          <ExploreMap
            enabled
            focus={{}}
            location={{
              status: "denied",
              coordinates: null,
              canOpenSettings: false,
            }}
            requestLocation={async () => undefined}
            exploreRegion={whistler}
            searchVisible={false}
          />
        );
      });
      await settle();
      expect(pinNames()).toEqual(["Whistler bar"]);

      let finishRegulars!: (locations: typeof venues) => void;
      mockRegulars.mockImplementationOnce(
        () =>
          new Promise<typeof venues>((resolve) => {
            finishRegulars = resolve;
          })
      );
      act(() => map().props.onRegionChangeComplete(vancouver));
      await settle();
      expect(mockRegulars).toHaveBeenLastCalledWith([venues[1]]);

      // The venue response arrived, but its regulars are still loading when
      // the user nudges the map within that request's padded viewport.
      act(() =>
        map().props.onRegionChangeComplete({ ...vancouver, latitude: 49.29 })
      );
      await act(async () => finishRegulars([venues[1]]));
      await settle();

      expect(pinNames()).toContain("Vancouver bar");
      expect(renderer.root.findByType(ExploreMap).props.exploreRegion).toBe(
        whistler
      );
    }
  );

  it.each([true, false])(
    "shows pins outside the selected region after panning (signed in: %s)",
    async (signedIn) => {
      mockSignedIn = signedIn;
      await act(async () => {
        renderer = create(
          <ExploreMap
            enabled
            focus={{}}
            location={{
              status: "denied",
              coordinates: null,
              canOpenSettings: false,
            }}
            requestLocation={async () => undefined}
            exploreRegion={whistler}
            searchVisible={false}
          />
        );
      });
      await settle();
      expect(pinNames()).toEqual(["Whistler bar"]);

      act(() => map().props.onRegionChangeComplete(vancouver));
      await settle();
      expect(pinNames()).toContain("Vancouver bar");
      expect(renderer.root.findByType(ExploreMap).props.exploreRegion).toBe(
        whistler
      );

      // A wider viewport can contain both regions without changing selection.
      act(() =>
        map().props.onRegionChangeComplete({
          latitude: 49.7,
          longitude: -122.7,
          latitudeDelta: 3,
          longitudeDelta: 3,
        })
      );
      await settle();
      expect(pinNames()).toEqual(["Whistler bar", "Vancouver bar"]);
      if (signedIn) {
        expect(
          mockRpc.mock.calls.every(([rpc]) => rpc === "locations_in_view")
        ).toBe(true);
      } else {
        expect(
          mockPublicViewport.mock.calls.every(([args]) => !("regionId" in args))
        ).toBe(true);
      }
    }
  );
  it("leaves room below the search bar for its results", async () => {
    await act(async () => {
      renderer = create(
        <ExploreMap
          enabled
          focus={{}}
          location={{
            status: "denied",
            coordinates: null,
            canOpenSettings: false,
          }}
          requestLocation={async () => undefined}
          exploreRegion={whistler}
          searchVisible
        />
      );
    });

    // The results list hangs below the field, outside the overlay's own
    // height, so nothing wrapping the search may clip its overflow.
    let node = renderer.root.findByType("Search" as React.ElementType).parent;
    while (node) {
      const style = StyleSheet.flatten(node.props.style);
      expect(style?.overflow).not.toBe("hidden");
      node = node.parent;
    }
  });
});
