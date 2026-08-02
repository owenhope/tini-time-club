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
import { fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
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
}

export default function ProfileList({
  profiles,
  enableSearch = false,
}: ProfileListProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const { profile } = useProfile();
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  // Track profile ids that are currently being updated
  const [updatingFollowIds, setUpdatingFollowIds] = useState<string[]>([]);

  // Fetch followed IDs for the current user.
  useEffect(() => {
    const fetchFollowedIds = async () => {
      if (!profile) return;
      const { data, error } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", profile.id);
      if (error) {
        reportError("Error fetching followed ids:", error);
      } else if (data) {
        setFollowedIds(data.map((row: any) => row.following_id));
      }
    };
    fetchFollowedIds();
  }, [profile]);

  // Toggle follow/unfollow action.
  const toggleFollow = async (targetProfileId: string) => {
    if (!profile) return;
    // Prevent duplicate requests.
    if (updatingFollowIds.includes(targetProfileId)) return;

    setUpdatingFollowIds((prev) => [...prev, targetProfileId]);
    const isFollowing = followedIds.includes(targetProfileId);
    if (isFollowing) {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", profile.id)
        .eq("following_id", targetProfileId);
      if (error) {
        reportError("Error unfollowing:", error);
      } else {
        setFollowedIds((prev) => prev.filter((id) => id !== targetProfileId));
      }
    } else {
      const { error } = await supabase
        .from("followers")
        .upsert([{ follower_id: profile.id, following_id: targetProfileId }]);
      if (error) {
        reportError("Error following:", error);
      } else {
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
              size={32}
              reviewCount={item.review_count}
            />
            <VerifiedName
              name={item.username || "Unknown User"}
              isVerified={item.is_verified}
              badgeSize={14}
              textStyle={styles.username}
            />
          </TouchableOpacity>
        </Link>
        {!isSelf && (
          <TouchableOpacity
            onPress={() => toggleFollow(item.id)}
            style={[
              styles.followButton,
              isFollowing && styles.followingButton,
              isUpdating && styles.disabledButton,
            ]}
            disabled={isUpdating}
            activeOpacity={0.7}
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
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
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
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    height: 48,
    backgroundColor: t.colors.surface,
    borderColor: t.colors.border,
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: t.colors.text,
    ...t.elevation.card,
  },
  listContent: {
    paddingBottom: 20,
  },
  profileCard: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.md,
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
    gap: 10,
  },
  username: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  followButton: {
    backgroundColor: t.colors.accent,
    paddingVertical: 6,
    paddingHorizontal: t.spacing.md,
    borderRadius: 25,
    minWidth: 70,
    alignItems: "center" as const,
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
    color: t.colors.onAccent,
    fontSize: 13,
    fontFamily: fonts.semibold,
  },
  followingButtonText: {
    color: t.colors.textSecondary,
  },
}));
