import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import { Avatar, VerifiedName } from "@/components/shared";
import { Link } from "expo-router";
import AnalyticService from "@/services/analyticsService";
import databaseService from "@/services/databaseService";
import { fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { setFollowing } from "@/services/followService";
export interface ProfileType {
  id: string;
  username: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  review_count?: number;
}

interface ProfileListProps {
  profiles: ProfileType[];
  enableSearch?: boolean;
  /** The parent surface already supplies its own gutter and background. */
  embedded?: boolean;
}

const PROFILE_ROW_AVATAR_SIZE = 28;

export default function ProfileList({
  profiles,
  enableSearch = false,
  embedded = false,
}: ProfileListProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile, loading: profileLoading } = useProfile();
  const profileId = profile?.id;
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [followStateReady, setFollowStateReady] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Track profile ids that are currently being updated
  const [updatingFollowIds, setUpdatingFollowIds] = useState<string[]>([]);

  // Fetch followed IDs for the current user.
  useEffect(() => {
    let cancelled = false;

    const fetchFollowedIds = async () => {
      if (profileLoading) return;

      if (!profileId) {
        if (!cancelled) {
          setFollowedIds([]);
          setFollowStateReady(true);
        }
        return;
      }

      setFollowStateReady(false);
      const { data, error } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", profileId);
      if (error) {
        reportError("Error fetching followed ids:", error);
      }

      if (!cancelled) {
        setFollowedIds(
          error || !data ? [] : data.map((row: any) => row.following_id)
        );
        setFollowStateReady(true);
      }
    };

    void fetchFollowedIds();
    return () => {
      cancelled = true;
    };
  }, [profileId, profileLoading]);

  // Toggle follow/unfollow action.
  const toggleFollow = async (targetProfileId: string) => {
    if (!profile) return;
    // Prevent duplicate requests.
    if (updatingFollowIds.includes(targetProfileId)) return;

    setUpdatingFollowIds((prev) => [...prev, targetProfileId]);
    const isFollowing = followedIds.includes(targetProfileId);
    try {
      await setFollowing(profile.id, targetProfileId, !isFollowing);
      if (isFollowing) {
        databaseService.clearFollowCaches(profile.id);
        setFollowedIds((prev) => prev.filter((id) => id !== targetProfileId));
      } else {
        databaseService.clearFollowCaches(profile.id);
        setFollowedIds((prev) => [...prev, targetProfileId]);
        // Track follow event
        const targetProfile = profiles.find((p) => p.id === targetProfileId);
        if (targetProfile) {
          AnalyticService.capture("follow_user", {
            targetUserId: targetProfileId,
            targetUsername: targetProfile.username,
          });
        }
      }
    } catch (error) {
      reportError(
        isFollowing ? "Error unfollowing:" : "Error following:",
        error
      );
    }
    setUpdatingFollowIds((prev) => prev.filter((id) => id !== targetProfileId));
  };

  const displayedProfiles = enableSearch
    ? profiles.filter((p) =>
        (p.username || "").toLowerCase().includes(searchQuery.toLowerCase())
      )
    : profiles;

  const renderItem = ({ item }: { item: ProfileType }) => {
    const isSelf = profile?.id === item.id;
    const isFollowing = followedIds.includes(item.id);
    const isUpdating = updatingFollowIds.includes(item.id);
    return (
      <View style={styles.profileCard}>
        <Link href={`/users/${item.username || "unknown"}`} asChild>
          <TouchableOpacity style={styles.profileInfo} activeOpacity={0.7}>
            <Avatar
              avatarPath={item.avatar_url}
              username={item.username}
              size={PROFILE_ROW_AVATAR_SIZE}
              reviewCount={item.review_count}
            />
            <VerifiedName
              name={item.username || "Unknown User"}
              isVerified={item.is_verified}
              badgeSize={14}
              style={styles.usernameRow}
              textStyle={styles.username}
            />
          </TouchableOpacity>
        </Link>
        {!isSelf && (
          <View style={styles.followButtonSlot}>
            {followStateReady ? (
              <TouchableOpacity
                onPress={() => toggleFollow(item.id)}
                style={[
                  styles.followButton,
                  isFollowing && styles.followingButton,
                  isUpdating && styles.disabledButton,
                ]}
                disabled={isUpdating}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={
                  isFollowing
                    ? `Unfollow ${item.username}`
                    : `Follow ${item.username}`
                }
                accessibilityState={{ disabled: isUpdating }}
              >
                <Text
                  style={[
                    styles.buttonText,
                    isFollowing && styles.followingButtonText,
                  ]}
                >
                  {isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, embedded && styles.embeddedContainer]}>
      {enableSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search profiles..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}
      <FlatList
        data={displayedProfiles}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  embeddedContainer: {
    backgroundColor: t.colors.surface,
    paddingHorizontal: 0,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    height: 48,
    backgroundColor: t.colors.surface,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: t.radius.pill,
    paddingHorizontal: t.spacing.gutter,
    ...t.typography.body,
    color: t.colors.text,
    ...t.elevation.card,
  },
  listContent: {
    paddingBottom: 20,
  },
  profileCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.card,
    padding: t.spacing.md,
    marginBottom: t.spacing.sm,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    ...t.elevation.card,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  profileInfo: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    flex: 1,
    minWidth: 0,
    gap: 10,
  },
  username: {
    ...t.typography.bodyStrong,
    color: t.colors.usernameText,
  },
  usernameRow: {
    alignSelf: "center" as const,
    flexShrink: 1,
  },
  followButton: {
    backgroundColor: t.colors.accent,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.pill,
    width: "100%" as const,
    height: 36,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  followButtonSlot: {
    width: 88,
    height: 36,
    marginLeft: t.spacing.sm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  followingButton: {
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: t.colors.borderStrong,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    ...t.typography.label,
    fontFamily: fonts.semibold,
    color: t.colors.onAccent,
  },
  followingButtonText: {
    color: t.colors.textSecondary,
  },
}));
