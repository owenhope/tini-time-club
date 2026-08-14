import { useCallback, useRef, useState } from "react";
import * as Device from "expo-device";
import * as Location from "expo-location";

export const EXPLORE_DEFAULT_COORDINATES = {
  latitude: 49.3104,
  longitude: -123.0815,
};

export type ExploreLocationState =
  | { status: "idle" | "loading"; coordinates: null; canOpenSettings: false }
  | {
      status: "ready";
      coordinates: { latitude: number; longitude: number };
      canOpenSettings: false;
    }
  | {
      status: "denied" | "unavailable";
      coordinates: null;
      canOpenSettings: boolean;
    };

const INITIAL_STATE: ExploreLocationState = {
  status: "idle",
  coordinates: null,
  canOpenSettings: false,
};

/**
 * One lazy location request shared by every Explore mode. The promise ref is
 * the internal seam that prevents Map and Top Places from starting competing
 * permission/location requests while the user switches between them.
 */
export function useExploreLocation() {
  const [state, setState] = useState<ExploreLocationState>(INITIAL_STATE);
  const requestRef = useRef<Promise<void> | null>(null);

  const request = useCallback(() => {
    if (requestRef.current) return requestRef.current;
    if (state.status === "ready" || state.status === "denied") {
      return Promise.resolve();
    }

    const pending = (async () => {
      setState({
        status: "loading",
        coordinates: null,
        canOpenSettings: false,
      });

      try {
        const { status, canAskAgain } =
          await Location.requestForegroundPermissionsAsync();

        if (status !== "granted") {
          setState({
            status: "denied",
            coordinates: null,
            canOpenSettings: !canAskAgain,
          });
          return;
        }

        const coordinates =
          __DEV__ && !Device.isDevice
            ? EXPLORE_DEFAULT_COORDINATES
            : (await Location.getCurrentPositionAsync({})).coords;

        setState({
          status: "ready",
          coordinates: {
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
          },
          canOpenSettings: false,
        });
      } catch {
        setState({
          status: "unavailable",
          coordinates: null,
          canOpenSettings: false,
        });
      } finally {
        requestRef.current = null;
      }
    })();

    requestRef.current = pending;
    return pending;
  }, [state.status]);

  return { state, request };
}
