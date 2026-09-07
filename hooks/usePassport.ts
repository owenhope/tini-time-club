import { useCallback, useState } from "react";
import { useFocusEffect } from "expo-router";
import {
  getMemberPassport,
  getMyPassport,
  type Passport,
} from "@/services/passportService";
import { reportError } from "@/utils/log";

/**
 * The signed-in member's Passport, or — given a profileId — another member's
 * (read-only; their awards reconcile on their own device).
 */
export function usePassport(profileId?: string | null) {
  const [passport, setPassport] = useState<Passport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setPassport(
        await (profileId ? getMemberPassport(profileId) : getMyPassport())
      );
    } catch (cause) {
      reportError("Unable to load Martini Passport:", cause);
      setError(
        profileId
          ? "We couldn't load this Passport. Pull to try again."
          : "We couldn't load your Passport. Pull to try again."
      );
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh])
  );

  return { passport, loading, error, refresh };
}
