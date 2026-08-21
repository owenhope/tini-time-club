import React, { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
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
import { useMembership } from "@/context/membership-context";
import { makeStyles } from "@/theme";
import type { MembershipIntent } from "@/utils/membership";

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

const membershipIntentForView = (
  view: Exclude<ExploreView, "map">
): MembershipIntent =>
  view === "members" ? "members-directory" : "top-places";

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
  const { isMember, requireMembership } = useMembership();
  const promptedView = useRef<ExploreListView | null>(null);
  const { state: location, request: requestLocation } = useExploreLocation();
  const displayedView: ExploreView = isMember ? view : "map";
  const activeListView: ExploreListView =
    displayedView === "members" ? "members" : "places";
  const [queries, setQueries] = useState<Record<ExploreListView, string>>({
    places: "",
    members: "",
  });

  const handleViewChange = useCallback(
    (nextView: ExploreView) => {
      if (
        nextView !== "map" &&
        !requireMembership(membershipIntentForView(nextView))
      ) {
        return;
      }
      onViewChange(nextView);
    },
    [onViewChange, requireMembership]
  );

  // Deep links and restored route parameters must obey the same boundary as a
  // tap. Keep Map rendered underneath the CTA so visitor-only sessions never
  // mount or fetch either member discovery list.
  useEffect(() => {
    if (isMember || view === "map") {
      promptedView.current = null;
      return;
    }
    // Opening the membership route changes the global pathname and therefore
    // the context callback identity while Explore remains mounted underneath.
    // Remember this request so that navigation change cannot stack duplicate
    // membership sheets.
    if (promptedView.current === view) return;
    promptedView.current = view;
    requireMembership(membershipIntentForView(view));
  }, [isMember, requireMembership, view]);

  return (
    <View style={styles.container}>
      <AppHeader
        variant="large"
        title="Explore"
        below={
          <SegmentedControl
            value={displayedView}
            options={EXPLORE_OPTIONS}
            onChange={handleViewChange}
            tone="ink"
          />
        }
      />

      <View style={styles.content}>
        <View
          style={[styles.panel, displayedView !== "map" && styles.hidden]}
          pointerEvents={displayedView === "map" ? "auto" : "none"}
        >
          <ExploreMap
            enabled={displayedView === "map"}
            focus={mapFocus}
            location={location}
            requestLocation={requestLocation}
          />
        </View>

        <View
          style={[styles.panel, displayedView === "map" && styles.hidden]}
          pointerEvents={displayedView === "map" ? "none" : "auto"}
        >
          <ExploreLists
            enabled={displayedView !== "map"}
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
    position: "relative" as const,
  },
  panel: {
    ...StyleSheet.absoluteFill,
  },
  hidden: {
    opacity: 0,
  },
}));
