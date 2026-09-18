import { useCallback, useState, useRef, useMemo } from "react";
import { useProfile } from "@/context/profile-context";
import { useMemberPoints } from "@/hooks/useMemberPoints";
import { useFocusEffect } from "expo-router";
import {
  getMemberPassport,
  getMyPassport,
  type Passport,
} from "@/services/passportService";
import { reportError } from "@/utils/log";

/**
 * The signed-in member's Passport, or — given a profileId — another member's
 * with access checks and award reconciliation owned by the server.
 */
export function usePassport(profileId?: string | null) {
  const { profile } = useProfile();
  const ownerId = profileId ?? profile?.id;
  const requestRef = useRef(0);
  const [result, setResult] = useState<{
    ownerId: string | undefined;
    passport: Passport;
  } | null>(null);
  const passport =
    result?.ownerId === ownerId ? (result?.passport ?? null) : null;
  const points = useMemberPoints({
    id: ownerId,
    passport_points: passport?.points,
  });
  const displayedPassport = useMemo(
    () => (passport ? { ...passport, points } : null),
    [passport, points]
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const request = ++requestRef.current;
    setLoading(true);
    setError(null);
    try {
      const loaded = await (profileId
        ? getMemberPassport(profileId)
        : getMyPassport());
      if (request === requestRef.current)
        setResult({ ownerId, passport: loaded });
    } catch (cause) {
      if (request !== requestRef.current) return;
      reportError("Unable to load Martini Passport:", cause);
      setError(
        profileId
          ? "We couldn't load this Passport. Pull to try again."
          : "We couldn't load your Passport. Pull to try again."
      );
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [profileId, ownerId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        requestRef.current++;
      };
    }, [refresh])
  );

  return {
    passport: displayedPassport,
    loading,
    error,
    refresh,
  };
}
