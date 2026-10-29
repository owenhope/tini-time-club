import Supercluster from "supercluster";
import { Dimensions } from "react-native";
import type { Region } from "react-native-maps";
import {
  getGoldenGlassGroupRegion,
  groupGoldenGlassPins,
  pinFootprint,
  projectToViewport,
  type MapViewport,
} from "@/utils/goldenGlassMapGroups";

interface MapPlace {
  id: string | number;
  lat: number;
  long: number;
  is_golden_glass?: boolean | null;
}

export interface MapCluster<T> {
  key: string;
  latitude: number;
  longitude: number;
  members: T[];
  goldenCount: number;
  favoriteCount: number;
}

export interface MapPinLayout<T> {
  clusters: MapCluster<T>[];
  /** Drawn one pin per place: ordinary leftovers and standing gold/pink. */
  pins: T[];
  /** Overlapping gold/pink places drawn as one counted pin. */
  groups: T[][];
}

/** The cluster bubble's diameter, which grows with its count. */
export const clusterBubbleSize = (count: number) =>
  count >= 25 ? 66 : count >= 10 ? 58 : 48;

// The clustering the map has always had: a few pins' width of radius, three
// or more places before they fold together.
const CLUSTER_OPTIONS = {
  radius: Dimensions.get("window").width * 0.06,
  extent: 512,
  minPoints: 3,
  minZoom: 1,
  maxZoom: 20,
  nodeSize: 64,
};
const GAP = 4;

/** A tile zoom where one extent unit is roughly one point on screen. */
const zoomFor = (region: Region, viewport: MapViewport) =>
  Math.log2(
    (360 / Math.max(Math.abs(region.longitudeDelta), 1e-9)) *
      (viewport.width / CLUSTER_OPTIONS.extent)
  );

const groupAnchor = <T extends MapPlace>(members: T[], region: Region) => {
  if (members.length === 1) return members[0];
  const center = getGoldenGlassGroupRegion(members, region);
  return { lat: center.latitude, long: center.longitude };
};

/**
 * Decides what the map draws: clusters, single pins, and groups of Golden
 * Glass or liked places.
 *
 * Gold and pink places stand on their own at city zoom so they are never
 * buried in a count — unless their pin would land on a cluster bubble, where
 * three markers stacked on one spot read as noise. Those fold into that
 * cluster and surface as its badges instead, and separate again as soon as
 * zooming gives them room.
 */
export function layoutMapPins<T extends MapPlace>({
  places,
  favoriteIds,
  region,
  viewport,
  selectedId,
  specialsStandAlone,
}: {
  places: T[];
  favoriteIds: ReadonlySet<string>;
  region: Region;
  viewport: MapViewport;
  selectedId: string | number | null;
  specialsStandAlone: boolean;
}): MapPinLayout<T> {
  if (viewport.width <= 0 || viewport.height <= 0) {
    return { clusters: [], pins: places, groups: [] };
  }

  const isFavorite = (place: T) => favoriteIds.has(String(place.id));
  const isSpecial = (place: T) =>
    Boolean(place.is_golden_glass) || isFavorite(place);
  const clustered = specialsStandAlone
    ? places.filter((place) => !isSpecial(place))
    : places;

  const index = new Supercluster<{ index: number }>(CLUSTER_OPTIONS);
  index.load(
    clustered.map((place, i) => ({
      type: "Feature" as const,
      properties: { index: i },
      geometry: {
        type: "Point" as const,
        coordinates: [place.long, place.lat],
      },
    }))
  );

  const clamp = (value: number, limit: number) =>
    Math.max(-limit, Math.min(limit, value));
  // A screen's margin either side, so clusters don't re-form at the edges.
  const bbox: [number, number, number, number] = [
    clamp(region.longitude - region.longitudeDelta, 180),
    clamp(region.latitude - region.latitudeDelta, 85),
    clamp(region.longitude + region.longitudeDelta, 180),
    clamp(region.latitude + region.latitudeDelta, 85),
  ];

  const clusters: (Omit<MapCluster<T>, "goldenCount" | "favoriteCount"> & {
    x: number;
    y: number;
    size: number;
  })[] = [];
  const pins: T[] = [];
  const groups: T[][] = [];

  for (const feature of index.getClusters(
    bbox,
    Math.floor(zoomFor(region, viewport))
  )) {
    const [longitude, latitude] = feature.geometry.coordinates;
    if ("cluster" in feature.properties && feature.properties.cluster) {
      const members = index
        .getLeaves(feature.properties.cluster_id, Infinity)
        .map((leaf) => clustered[leaf.properties.index]);
      const { x, y } = projectToViewport(
        { lat: latitude, long: longitude },
        region,
        viewport
      );
      clusters.push({
        key: "",
        latitude,
        longitude,
        members,
        x,
        y,
        size: clusterBubbleSize(members.length),
      });
    } else {
      pins.push(clustered[(feature.properties as { index: number }).index]);
    }
  }

  if (specialsStandAlone) {
    const units = groupGoldenGlassPins(
      places.filter(isSpecial),
      region,
      viewport,
      selectedId
    );
    for (const unit of units) {
      const anchor = projectToViewport(
        groupAnchor(unit, region),
        region,
        viewport
      );
      const pin = pinFootprint(
        unit.some((place) => String(place.id) === String(selectedId))
      );
      const pinCenterY = anchor.y - pin.height / 2;
      let nearest: (typeof clusters)[number] | null = null;
      let nearestDistance = Infinity;
      for (const cluster of clusters) {
        const overlaps =
          Math.abs(anchor.x - cluster.x) <
            pin.width / 2 + cluster.size / 2 + GAP &&
          Math.abs(pinCenterY - cluster.y) <
            pin.height / 2 + cluster.size / 2 + GAP;
        const distance = Math.hypot(
          anchor.x - cluster.x,
          pinCenterY - cluster.y
        );
        if (overlaps && distance < nearestDistance) {
          nearest = cluster;
          nearestDistance = distance;
        }
      }
      if (nearest) nearest.members.push(...unit);
      else if (unit.length > 1) groups.push(unit);
      else pins.push(unit[0]);
    }
  }

  return {
    clusters: clusters.map(({ latitude, longitude, members }) => {
      const goldenCount = members.filter(
        (place) => place.is_golden_glass
      ).length;
      const favoriteCount = members.filter(isFavorite).length;
      const ids = members.map((place) => String(place.id)).sort();
      return {
        // Cluster markers snapshot once, so the key carries everything drawn.
        key: `cluster-${ids[0]}-${members.length}-${goldenCount}-${favoriteCount}`,
        latitude,
        longitude,
        members,
        goldenCount,
        favoriteCount,
      };
    }),
    pins,
    groups,
  };
}
