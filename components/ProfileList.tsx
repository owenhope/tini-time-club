import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import { Avatar } from "@/components/shared";
import { Link } from "expo-router";
import { NOTIFICATION_TYPES } from "@/utils/consts";
export interface ProfileType {
  id: string;
  username: string;
  // add other fields as needed
}

interface ProfileListProps {
  profiles: ProfileType[];
  enableSearch?: boolean;
}

export default function ProfileList({
  profiles,
  enableSearch = false,
}: ProfileListProps) {
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
        console.error("Error fetching followed ids:", error);
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
        console.error("Error unfollowing:", error);
      } else {
        setFollowedIds((prev) => prev.filter((id) => id !== targetProfileId));
      }
    } else {
      const { error } = await supabase
        .from("followers")
        .upsert([{ follower_id: profile.id, following_id: targetProfileId }]);
      if (error) {
        console.error("Error following:", error);
      } else {
        if (profile && profile.id && profile.username) {
          const notificationBody = `${profile.username} started following you`;
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              user_id: targetProfileId,
              body: notificationBody,
              type: NOTIFICATION_TYPES.USER,
            });
          if (notificationError) {
            console.error("Error creating notification:", notificationError);
          }
        }
        setFollowedIds((prev) => [...prev, targetProfileId]);
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
        <Link href={`/home/users/${item.username || "unknown"}`} asChild>
          <TouchableOpacity style={styles.profileInfo} activeOpacity={0.7}>
            <Avatar
              avatarPath={item.avatar_url}
              username={item.username}
              size={32}
              style={styles.avatar}
            />
            <Text style={styles.username}>
              {item.username || "Unknown User"}
            </Text>
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
            placeholderTextColor="#9ca3af"
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    height: 48,
    backgroundColor: "#ffffff",
    borderColor: "#e5e7eb",
    borderWidth: 1,
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    color: "#1a1a1a",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  profileCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#f1f5f9",
  },
  profileInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  username: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  followButton: {
    backgroundColor: "#B6A3E2",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 25,
    minWidth: 70,
    alignItems: "center",
  },
  followingButton: {
    backgroundColor: "#f3f4f6",
    borderWidth: 1,
    borderColor: "#d1d5db",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  followingButtonText: {
    color: "#6b7280",
  },
});
