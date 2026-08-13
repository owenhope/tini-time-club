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
import { supabase } from "@/utils/supabase";

export interface ActivityContextValue {
  unseenCount: number;
  refreshUnseenCount: () => Promise<void>;
  clearUnseenIndicator: () => void;
  markPushOpened: (notificationId: string) => Promise<void>;
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

  const refreshUnseenCount = useCallback(async () => {
    if (!profileId) {
      setUnseenCount(0);
      return;
    }
    try {
      setUnseenCount(await fetchUnseenActivityCount());
    } catch (error) {
      reportError("Failed to refresh Activity badge:", error);
    }
  }, [profileId]);

  const markPushOpened = useCallback(async (notificationId: string) => {
    try {
      await markActivityRead([notificationId]);
      setUnseenCount((count) => Math.max(0, count - 1));
    } catch (error) {
      reportError("Failed to mark push Activity as read:", error);
    }
  }, []);

  const clearUnseenIndicator = useCallback(() => {
    setUnseenCount(0);
  }, []);

  useEffect(() => {
    const previousProfileId = previousProfileIdRef.current;
    if (previousProfileId && previousProfileId !== profileId) {
      void clearActivityCache(previousProfileId);
    }
    previousProfileIdRef.current = profileId;
    setUnseenCount(0);
    if (!profileId) return;

    void refreshUnseenCount();
    const scheduleRefresh = () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        refreshTimerRef.current = null;
        void refreshUnseenCount();
      }, 250);
    };
    const unsubscribe = subscribeToActivityChanges(profileId, scheduleRefresh);
    const appStateSubscription = AppState.addEventListener(
      "change",
      (state) => {
        if (state === "active") void refreshUnseenCount();
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
    });
    return () => subscription.unsubscribe();
  }, [profileId]);

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
