import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, Text, TouchableOpacity } from "react-native";
import {
  getFollowProfiles,
  type FollowDirection,
} from "@/services/memberListService";
import ProfileList, { ProfileType } from "@/components/ProfileList";
import { useLocalSearchParams } from "expo-router";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";

export type { FollowDirection } from "@/services/memberListService";

/**
 * Shared implementation for the follower/following lists.
 *
 * This screen was previously copy-pasted four times — followers.tsx and
 * following.tsx under both the home and discover tab stacks, byte-identical
 * across stacks and differing only in query direction between the two.
 */
const UserFollowList = ({ direction }: { direction: FollowDirection }) => {
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const params = useLocalSearchParams();
  const username = params.username as string;
  const styles = useStyles();
  const { colors } = useTheme();

  const isFollowers = direction === "followers";
  const noun = isFollowers ? "followers" : "following";

  useEffect(() => {
    let cancelled = false;

    const fetchList = async () => {
      if (!username) return;

      setLoading(true);
      setError(null);
      setProfiles([]);
      try {
        const list = await getFollowProfiles(username, direction);
        if (!cancelled) setProfiles(list);
      } catch (err) {
        reportError(`Unexpected error fetching ${noun}:`, err);
        if (!cancelled) setError(`We couldn't load ${noun}.`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchList();
    return () => {
      cancelled = true;
    };
  }, [username, direction, noun, retryCount]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.statusText}>Loading {noun}...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.statusText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => setRetryCount((current) => current + 1)}
          accessibilityRole="button"
        >
          <Text style={styles.retryText}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (profiles.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.statusText}>
          {isFollowers
            ? "Nobody's following yet. The club rewards the loud."
            : "Not following anyone. Go find your people."}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProfileList profiles={profiles} enableSearch={true} />
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: t.colors.background,
    padding: t.spacing.xl,
    gap: t.spacing.md,
  },
  statusText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
  },
  retryButton: {
    backgroundColor: t.colors.accent,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.xl,
    borderRadius: t.radius.pill,
  },
  retryText: {
    ...t.typography.bodyStrong,
    color: t.colors.onAccent,
  },
}));

export default UserFollowList;
