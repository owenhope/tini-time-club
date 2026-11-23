import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";
import { useProfile } from "@/context/profile-context";
import {
  fetchUnseenActivityCount,
  markActivityRead,
  subscribeToActivityChanges,
} from "@/services/activityService";
import { reportError } from "@/utils/log";
import { clearActivityCache } from "@/utils/activityCache";
import { setActivityBadgeCount } from "@/utils/activityBadge";
import { supabase } from "@/utils/supabase";
import { requestPassportReconciliation } from "@/utils/passport-reconciliation-events";

export interface ActivityContextValue {
  unseenCount: number;
  refreshUnseenCount: () => Promise<void>;
  clearUnseenIndicator: () => void;
  markPushOpened: (notificationId: string) => Promise<void>;
}

function isExpiredJwtError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { code?: unknown }).code === "PGRST301"
  );
}

const ActivityContext = createContext<ActivityContextValue | undefined>(
  undefined
);

export function ActivityProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const [unseenCount, setUnseenCount] = useState(0);
  const profileId = profile?.id ?? null;
  const previousProfileIdRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appStateRef = useRef(AppState.currentState);

  const refreshUnseenCount = useCallback(async () => {
    if (!profileId) {
      setUnseenCount(0);
      return;
    }
    try {
      const nextCount = await fetchUnseenActivityCount();
      // A response that lands after sign-out or an account switch belongs
      // to the previous member; never apply it to the current badge.
      if (previousProfileIdRef.current !== profileId) return;
      setUnseenCount(nextCount);
      await setActivityBadgeCount(nextCount);
    } catch (error) {
      // An expired access token is expected on resume before supabase-js
      // renews it; the TOKEN_REFRESHED listener below refreshes the badge.
      if (appStateRef.current === "active" && !isExpiredJwtError(error)) {
        reportError("Failed to refresh Activity badge:", error);
      }
    }
  }, [profileId]);

  const markPushOpened = useCallback(
    async (notificationId: string) => {
      try {
        await markActivityRead([notificationId]);
        const nextCount = await fetchUnseenActivityCount();
        if (!profileId || previousProfileIdRef.current !== profileId) return;
        setUnseenCount(nextCount);
        await setActivityBadgeCount(nextCount);
      } catch (error) {
        reportError("Failed to mark push Activity as read:", error);
      }
    },
    [profileId]
  );

  const clearUnseenIndicator = useCallback(() => {
    setUnseenCount(0);
    void setActivityBadgeCount(0).catch((error) =>
      reportError("Failed to clear Activity badge:", error)
    );
  }, []);

  useEffect(() => {
    const previousProfileId = previousProfileIdRef.current;
    if (previousProfileId && previousProfileId !== profileId) {
      void clearActivityCache(previousProfileId);
    }
    previousProfileIdRef.current = profileId;
    setUnseenCount(0);
    void setActivityBadgeCount(0).catch((error) =>
      reportError("Failed to reset Activity badge:", error)
    );
    if (!profileId) return;

    void refreshUnseenCount();
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        requestPassportReconciliation();
        void refreshUnseenCount();
      }, 250);
    };
    const unsubscribe = subscribeToActivityChanges(profileId, scheduleRefresh);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        appStateRef.current = state;
        if (state === "active") {
          requestPassportReconciliation();
          void refreshUnseenCount();
        }
      }
    );

    return () => {
      unsubscribe();
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
      appStateSubscription.remove();
    };
  }, [profileId, refreshUnseenCount]);

  useEffect(() => {
    if (!profileId) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") void clearActivityCache(profileId);
      if (event === "TOKEN_REFRESHED") void refreshUnseenCount();
    });
    return () => subscription.unsubscribe();
  }, [profileId, refreshUnseenCount]);

  return (
    <ActivityContext.Provider
      value={{
        unseenCount,
        refreshUnseenCount,
        clearUnseenIndicator,
        markPushOpened,
      }}
    >
      {children}
    </ActivityContext.Provider>
  );
}

export function useActivity(): ActivityContextValue {
  const context = useContext(ActivityContext);
  if (!context) {
    throw new Error("useActivity must be used within ActivityProvider");
  }
  return context;
}
