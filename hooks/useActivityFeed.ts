import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AppState } from "react-native";
import { useProfile } from "@/context/profile-context";
import {
  fetchActivityPage,
  markActivitySeenThrough,
  subscribeToActivityChanges,
} from "@/services/activityService";
import { setFollowing } from "@/services/followService";
import AnalyticService from "@/services/analyticsService";
import { readActivityCache, writeActivityCache } from "@/utils/activityCache";
import {
  groupActivityEvents,
  sectionActivityRows,
} from "@/utils/activityGrouping";
import { reportError } from "@/utils/log";
import type {
  ActivityDisplayRow,
  ActivityEvent,
  ActivitySection,
  FollowActivityRow,
} from "@/types/activity";

export type ActivityFeedState =
  "loading" | "ready" | "empty" | "offline" | "error";

export interface ActivityFeed {
  sections: ActivitySection[];
  state: ActivityFeedState;
  refreshing: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  activate: (row: ActivityDisplayRow) => Promise<void>;
  followBack: (row: FollowActivityRow) => Promise<void>;
}

export function useActivityFeed(): ActivityFeed {
  const { profile } = useProfile();
  const profileId = profile?.id;
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [cursor, setCursor] = useState<{
    createdAt: string;
    id: string;
  } | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [state, setState] = useState<ActivityFeedState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const loadingMoreRef = useRef(false);
  const mountedRef = useRef(true);
  const refreshTokenRef = useRef(0);
  const profileRequestVersionRef = useRef(0);
  const realtimeRefreshRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageNumberRef = useRef(0);

  const mergeEvents = useCallback(
    (incoming: ActivityEvent[], replace: boolean) => {
      setEvents((current) => {
        const byId = new Map<string, ActivityEvent>();
        if (!replace) current.forEach((event) => byId.set(event.id, event));
        incoming.forEach((event) => byId.set(event.id, event));
        return [...byId.values()].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime() ||
            b.id.localeCompare(a.id)
        );
      });
    },
    []
  );

  const refresh = useCallback(
    async (showRefreshIndicator = true) => {
      if (!profileId) return;
      const token = ++refreshTokenRef.current;
      const profileRequestVersion = profileRequestVersionRef.current;
      if (showRefreshIndicator) setRefreshing(true);
      try {
        const page = await fetchActivityPage(null, 30);
        if (
          !mountedRef.current ||
          token !== refreshTokenRef.current ||
          profileRequestVersion !== profileRequestVersionRef.current
        )
          return;
        const unseenAtSnapshot = page.events
          .filter((event) => event.seenAt === null)
          .map((event) => event.id);
        setNewIds((current) => new Set([...current, ...unseenAtSnapshot]));
        mergeEvents(page.events, true);
        setCursor(page.nextCursor);
        setHasMore(page.hasMore);
        setState(page.events.length ? "ready" : "empty");
        pageNumberRef.current = 1;
        AnalyticService.capture("activity_page_load", {
          page: 1,
          count: page.events.length,
          cached: false,
        });
        void markActivitySeenThrough(page.snapshotAt).catch((error) =>
          reportError("Failed to mark Activity seen:", error)
        );
        await writeActivityCache(profileId, page).catch((error) =>
          reportError("Failed to cache Activity:", error)
        );
      } catch (error) {
        const cached = await readActivityCache(profileId);
        if (
          !mountedRef.current ||
          token !== refreshTokenRef.current ||
          profileRequestVersion !== profileRequestVersionRef.current
        )
          return;
        if (cached) {
          mergeEvents(cached.events, true);
          setCursor(cached.nextCursor);
          setHasMore(cached.hasMore);
          setState(cached.events.length ? "offline" : "empty");
          pageNumberRef.current = 1;
          AnalyticService.capture("activity_page_load", {
            page: 1,
            count: cached.events.length,
            cached: true,
          });
        } else {
          setState("error");
        }
        AnalyticService.capture("activity_load_error", { phase: "refresh" });
        reportError("Failed to load Activity:", error);
      } finally {
        if (
          showRefreshIndicator &&
          mountedRef.current &&
          token === refreshTokenRef.current &&
          profileRequestVersion === profileRequestVersionRef.current
        ) {
          setRefreshing(false);
        }
      }
    },
    [mergeEvents, profileId]
  );

  const loadMore = useCallback(async () => {
    if (!profileId || !hasMore || !cursor || loadingMoreRef.current) return;
    const profileRequestVersion = profileRequestVersionRef.current;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const page = await fetchActivityPage(cursor, 30);
      if (
        !mountedRef.current ||
        profileRequestVersion !== profileRequestVersionRef.current
      )
        return;
      mergeEvents(page.events, false);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
      setState("ready");
      const pageNumber = pageNumberRef.current + 1;
      pageNumberRef.current = pageNumber;
      AnalyticService.capture("activity_page_load", {
        page: pageNumber,
        count: page.events.length,
        cached: false,
      });
      const cached = await readActivityCache(profileId);
      if (
        !mountedRef.current ||
        profileRequestVersion !== profileRequestVersionRef.current
      )
        return;
      if (cached) {
        await writeActivityCache(profileId, {
          ...cached,
          events: [...cached.events, ...page.events],
          nextCursor: page.nextCursor,
          hasMore: page.hasMore,
        }).catch((error) => reportError("Failed to cache Activity:", error));
      }
    } catch (error) {
      AnalyticService.capture("activity_load_error", { phase: "load_more" });
      reportError("Failed to load earlier Activity:", error);
    } finally {
      if (profileRequestVersion === profileRequestVersionRef.current) {
        loadingMoreRef.current = false;
        if (mountedRef.current) setLoadingMore(false);
      }
    }
  }, [cursor, hasMore, mergeEvents, profileId]);

  const activate = useCallback(async (_row: ActivityDisplayRow) => {
    // Activity is informational: opening the center clears the header
    // indicator, while individual rows remain neutral and do not need a
    // separate read/receipt mutation.
  }, []);

  const followBack = useCallback(
    async (row: FollowActivityRow) => {
      if (!profileId || state === "offline" || row.isFollowing) return;
      await setFollowing(profileId, row.actor.id, true);
      setEvents((current) =>
        current.map((event) =>
          event.id === row.id ? { ...event, isFollowing: true } : event
        )
      );
    },
    [profileId, state]
  );

  useEffect(() => {
    mountedRef.current = true;
    profileRequestVersionRef.current += 1;
    refreshTokenRef.current += 1;
    loadingMoreRef.current = false;
    setEvents([]);
    setCursor(null);
    setHasMore(true);
    setNewIds(new Set());
    setLoadingMore(false);
    setState(profileId ? "loading" : "empty");
    if (profileId) void refresh(false);
    return () => {
      mountedRef.current = false;
    };
  }, [profileId, refresh]);

  useEffect(() => {
    if (!profileId) return;
    const scheduleRefresh = () => {
      if (realtimeRefreshRef.current) clearTimeout(realtimeRefreshRef.current);
      realtimeRefreshRef.current = setTimeout(() => {
        realtimeRefreshRef.current = null;
        void refresh();
      }, 250);
    };
    const unsubscribe = subscribeToActivityChanges(profileId, scheduleRefresh);
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") void refresh();
    });
    return () => {
      unsubscribe();
      if (realtimeRefreshRef.current) clearTimeout(realtimeRefreshRef.current);
      realtimeRefreshRef.current = null;
      subscription.remove();
    };
  }, [profileId, refresh]);

  const rows = useMemo(
    () => groupActivityEvents(events, newIds),
    [events, newIds]
  );
  const sections = useMemo(() => sectionActivityRows(rows), [rows]);

  return {
    sections,
    state,
    refreshing,
    loadingMore,
    hasMore,
    refresh,
    loadMore,
    activate,
    followBack,
  };
}
