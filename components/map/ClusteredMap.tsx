import React, { forwardRef } from "react";
import { Dimensions, LayoutAnimation } from "react-native";
import ClusteredMapView from "react-native-map-clustering";

/**
 * react-native-map-clustering ships its configuration as `defaultProps` on a
 * function component. React 19 dropped support for that, so every default
 * arrives as `undefined` — `mapRef(map)` then throws "undefined is not a
 * function" and the whole map screen fails to render.
 *
 * This wrapper re-applies the library's own defaults explicitly. Keep in sync
 * with ClusteredMapView.defaultProps if the dependency is ever upgraded.
 */
const CLUSTERING_DEFAULTS = {
  clusteringEnabled: true,
  spiralEnabled: true,
  animationEnabled: true,
  preserveClusterPressBehavior: false,
  layoutAnimationConf: LayoutAnimation.Presets.spring,
  tracksViewChanges: false,
  // SuperCluster parameters
  radius: Dimensions.get("window").width * 0.06,
  maxZoom: 20,
  minZoom: 1,
  minPoints: 2,
  extent: 512,
  nodeSize: 64,
  // Map parameters
  edgePadding: { top: 50, left: 50, right: 50, bottom: 50 },
  // Cluster styles
  clusterColor: "#00B386",
  clusterTextColor: "#FFFFFF",
  spiderLineColor: "#FF0000",
  // Callbacks
  onRegionChangeComplete: () => {},
  onClusterPress: () => {},
  onMarkersChange: () => {},
  superClusterRef: {},
  mapRef: () => {},
};

const BaseClusteredMapView = ClusteredMapView as any;

const ClusteredMap = forwardRef<any, any>((props, ref) => (
  <BaseClusteredMapView ref={ref} {...CLUSTERING_DEFAULTS} {...props} />
));

ClusteredMap.displayName = "ClusteredMap";

export default ClusteredMap;
