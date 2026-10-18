import { useCallback, useRef, useState } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import { useProfile } from "@/context/profile-context";
import { useMembership } from "@/context/membership-context";
import {
  getLocationFavorite,
  setLocationFavorite,
} from "@/services/locationFavoritesService";

export function useLocationFavorite(
  locationId: string | number | undefined,
  enabled = true
) {
  const memberId = useProfile().profile?.id;
  const { requireMembership } = useMembership();
  const id = locationId == null ? "" : String(locationId);
  const epoch = useRef(0);
  const pending = useRef(false);
  const [state, setState] = useState<{
    key: string;
    saved: boolean | null;
    busy: boolean;
  }>({ key: "", saved: null, busy: false });
  const key = `${memberId ?? ""}:${id}`;
  const valid = /^[1-9]\d*$/.test(id);

  const refresh = useCallback(async () => {
    if (!memberId || !valid || !enabled) return;
    const request = ++epoch.current;
    pending.current = true;
    setState({ key, saved: null, busy: true });
    try {
      const saved = await getLocationFavorite(id);
      if (request === epoch.current) setState({ key, saved, busy: false });
    } catch {
      if (request === epoch.current)
        setState({ key, saved: null, busy: false });
    } finally {
      if (request === epoch.current) pending.current = false;
    }
  }, [memberId, valid, enabled, key, id]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        epoch.current++;
        pending.current = false;
      };
    }, [refresh])
  );

  const saved = state.key === key ? state.saved : null;
  const busy = state.key === key && state.busy;
  const toggle = useCallback(async () => {
    if (!memberId) {
      requireMembership("location-details");
      return;
    }
    if (!valid || !enabled || pending.current) return;
    if (saved == null) {
      await refresh();
      return;
    }
    const request = epoch.current;
    pending.current = true;
    setState({ key, saved, busy: true });
    try {
      const confirmed = await setLocationFavorite(id, !saved);
      if (request === epoch.current)
        setState({ key, saved: confirmed, busy: false });
    } catch {
      if (request === epoch.current) {
        setState({ key, saved, busy: false });
        Alert.alert("Couldn't update Favorites", "Please try again.");
      }
    } finally {
      if (request === epoch.current) pending.current = false;
    }
  }, [memberId, requireMembership, valid, enabled, saved, refresh, key, id]);
  return {
    saved,
    busy,
    toggle,
    available: valid,
    needsRetry: Boolean(memberId) && saved == null && !busy,
  };
}
