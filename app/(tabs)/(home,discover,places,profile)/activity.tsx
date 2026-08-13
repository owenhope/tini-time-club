import React, { useCallback } from "react";
import { View } from "react-native";
import { useRouter, type Href } from "expo-router";
import ActivityEmptyState from "@/components/activity/ActivityEmptyState";
import ActivityList from "@/components/activity/ActivityList";
import ActivitySkeleton from "@/components/activity/ActivitySkeleton";
import AppText from "@/components/shared/AppText";
import Button from "@/components/shared/Button";
import { useActivityFeed } from "@/hooks/useActivityFeed";
import { useActivity } from "@/context/activity-context";
import { makeStyles } from "@/theme";
import type { ActivityDisplayRow, FollowActivityRow } from "@/types/activity";
import AnalyticService from "@/services/analyticsService";

export default function ActivityScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { clearUnseenIndicator } = useActivity();
  const feed = useActivityFeed();

  const activate = useCallback(
    async (row: ActivityDisplayRow) => {
      await feed.activate(row);
      AnalyticService.capture("activity_notification_open", {
        kind: row.kind,
        notificationCount: row.notificationIds.length,
      });
      if (row.route) router.push(row.route as Href);
    },
    [feed, router]
  );

  const followBack = useCallback(
    async (row: FollowActivityRow) => {
      await feed.followBack(row);
      AnalyticService.capture("activity_follow_back", {
        targetUserId: row.actor.id,
        targetUsername: row.actor.username,
        success: true,
      });
    },
    [feed]
  );

  React.useEffect(() => {
    clearUnseenIndicator();
    AnalyticService.capture("activity_open");
  }, [clearUnseenIndicator]);

  return (
    <View style={styles.container}>
      {feed.state === "loading" ? <ActivitySkeleton /> : null}
      {feed.state === "error" ? (
        <View style={styles.center}>
          <AppText variant="heading">Activity is unavailable</AppText>
          <AppText variant="body" tone="secondary" style={styles.centerText}>
            Check your connection and pull to try again.
          </AppText>
          <Button title="Try again" onPress={() => void feed.refresh()} />
        </View>
      ) : null}
      {feed.state === "empty" ? <ActivityEmptyState /> : null}
      {(feed.state === "ready" || feed.state === "offline") && (
        <>
          {feed.state === "offline" ? (
            <View style={styles.offlineBanner}>
              <AppText variant="caption" tone="secondary">
                Showing your latest saved activity. Reconnect to refresh.
              </AppText>
            </View>
          ) : null}
          <ActivityList
            sections={feed.sections}
            refreshing={feed.refreshing}
            loadingMore={feed.loadingMore}
            onRefresh={() => void feed.refresh()}
            onLoadMore={() => void feed.loadMore()}
            onPress={(row) => void activate(row)}
            onFollowBack={followBack}
            mutationsDisabled={feed.state === "offline"}
          />
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  center: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: t.spacing.xxl,
    gap: t.spacing.md,
  },
  centerText: {
    textAlign: "center" as const,
  },
  offlineBanner: {
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.sm,
    backgroundColor: t.colors.warning,
  },
}));
