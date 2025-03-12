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
              user_id: profile.id,
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

  // If search is enabled, filter profiles locally.
  const displayedProfiles = enableSearch
    ? profiles.filter((p) =>
        p.username.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : profiles;

  const renderItem = ({ item }: { item: ProfileType }) => {
    const isSelf = profile?.id === item.id;
    const isFollowing = followedIds.includes(item.id);
    const isUpdating = updatingFollowIds.includes(item.id);
    return (
      <Link href={`/${item.username}`} asChild>
        <TouchableOpacity style={styles.itemContainer}>
          <Text style={styles.username}>{item.username}</Text>
          {!isSelf && (
            <TouchableOpacity
              onPress={() => toggleFollow(item.id)}
              style={[
                styles.followButton,
                isFollowing && styles.followingButton,
                isUpdating && styles.disabledButton,
              ]}
              disabled={isUpdating}
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
        </TouchableOpacity>
      </Link>
    );
  };

  return (
    <View style={styles.container}>
      {enableSearch && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search profiles..."
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
    padding: 16,
  },
  searchContainer: {
    marginBottom: 12,
  },
  searchInput: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomColor: "#eee",
    borderBottomWidth: 1,
  },
  username: {
    fontSize: 16,
  },
  followButton: {
    backgroundColor: "#007aff",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  followingButton: {
    backgroundColor: "#ccc",
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#fff",
  },
  followingButtonText: {
    color: "#000",
  },
});
