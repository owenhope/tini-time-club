import React, { useState } from "react";
import { View } from "react-native";
import AppHeader from "@/components/nav/AppHeader";
import { SegmentedControl } from "@/components/shared";
import ExploreLists from "@/components/explore/ExploreLists";
import ExploreMap, {
  type ExploreMapFocus,
} from "@/components/explore/ExploreMap";
import {
  type ExploreListView,
  type ExploreView,
} from "@/components/explore/exploreView";
import { useExploreLocation } from "@/components/explore/useExploreLocation";
import { makeStyles } from "@/theme";

const EXPLORE_OPTIONS = [
  { value: "map", label: "Map" },
  { value: "places", label: "Top Places" },
  { value: "members", label: "Members" },
] as const;

interface ExploreScreenProps {
  view: ExploreView;
  onViewChange: (view: ExploreView) => void;
  mapFocus: ExploreMapFocus;
}

/**
 * The single Explore interface. Routing chooses a view and optional map focus;
 * search, location, map, and list state remain private to this module.
 */
export default function ExploreScreen({
  view,
  onViewChange,
  mapFocus,
}: ExploreScreenProps) {
  const styles = useStyles();
  const { state: location, request: requestLocation } = useExploreLocation();
  const activeListView: ExploreListView =
    view === "members" ? "members" : "places";
  const [queries, setQueries] = useState<Record<ExploreListView, string>>({
    places: "",
    members: "",
  });

  return (
    <View style={styles.container}>
      <AppHeader
        variant="large"
        title="Explore"
        below={
          <SegmentedControl
            value={view}
            options={EXPLORE_OPTIONS}
            onChange={onViewChange}
            tone="ink"
          />
        }
      />

      <View style={styles.content}>
        <View style={[styles.panel, view !== "map" && styles.hidden]}>
          <ExploreMap
            enabled={view === "map"}
            focus={mapFocus}
            location={location}
            requestLocation={requestLocation}
          />
        </View>

        <View style={[styles.panel, view === "map" && styles.hidden]}>
          <ExploreLists
            enabled={view !== "map"}
            activeView={activeListView}
            query={queries[activeListView]}
            onQueryChange={(query) =>
              setQueries((current) => ({
                ...current,
                [activeListView]: query,
              }))
            }
            location={location}
            requestLocation={requestLocation}
          />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surfaceInk,
  },
  content: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  panel: {
    flex: 1,
  },
  hidden: {
    display: "none" as const,
  },
}));
