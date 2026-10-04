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

export type ExploreLocationRequest = (force?: boolean) => Promise<void>;

/**
 * One lazy location request shared by every Explore mode. The promise ref is
 * the internal seam that prevents Map and Golden Glass from starting competing
 * permission/location requests while the user switches between them.
 */
export function useExploreLocation() {
  const [state, setStateValue] = useState<ExploreLocationState>(INITIAL_STATE);
  const requestRef = useRef<Promise<void> | null>(null);
  // Read through a ref so `request` keeps one identity: callers run it from
  // mount effects, and a new identity per status change re-ran those effects
  // into a request loop whenever location was unavailable.
  const statusRef = useRef<ExploreLocationState["status"]>(
    INITIAL_STATE.status
  );
  const setState = useCallback((next: ExploreLocationState) => {
    statusRef.current = next.status;
    setStateValue(next);
  }, []);

  const request = useCallback<ExploreLocationRequest>(
    (force = false) => {
      if (requestRef.current) return requestRef.current;
      // Every settled outcome waits for an explicit retry ("Use my location").
      if (
        !force &&
        (statusRef.current === "ready" ||
          statusRef.current === "denied" ||
          statusRef.current === "unavailable")
      ) {
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
    },
    [setState]
  );

  return { state, request };
}
