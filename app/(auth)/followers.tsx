import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "expo-router";

interface ProfileType {
  id: string;
  username: string;
  // add other fields as needed
}

const Followers = () => {
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const { profile } = useProfile();
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const navigation = useNavigation();

  // Fetch the list of profiles the current user already follows
  useEffect(() => {
    const fetchFollowedIds = async () => {
      if (!profile) return;
      const { data, error } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", profile.id);
      if (error) {
        console.error("Error fetching followed ids:", error);
      } else {
        setFollowedIds(data.map((row: any) => row.following_id));
      }
    };
    fetchFollowedIds();
  }, [profile]);

  // Fetch all profiles (excluding the current user) filtered by search query
  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      let query = supabase.from("profiles").select("*");

      // Exclude the current user's profile
      if (profile) {
        query = query.neq("id", profile.id);
      }

      // Apply search filtering if a query exists
      if (searchQuery) {
        query = query.ilike("username", `%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) {
        console.error("Error fetching profiles:", error);
      } else {
        setProfiles(data);
      }
      setLoading(false);
    };
    fetchProfiles();
  }, [searchQuery, profile]);

  const toggleFollow = async (targetProfileId: string) => {
    if (!profile) return;
    const isFollowing = followedIds.includes(targetProfileId);
    if (isFollowing) {
      // Unfollow: remove the follower row
      const { error, data } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", profile.id)
        .eq("following_id", targetProfileId);
      if (error) {
        console.error("Error unfollowing:", error);
      } else {
        console.log("Unfollow result:", data);
        setFollowedIds((prev) => prev.filter((id) => id !== targetProfileId));
      }
    } else {
      // Follow: use upsert to avoid duplicate key errors
      const { error, data } = await supabase
        .from("followers")
        .upsert([{ follower_id: profile.id, following_id: targetProfileId }]);
      if (error) {
        console.error("Error following:", error);
      } else {
        console.log("Follow result:", data);
        setFollowedIds((prev) => [...prev, targetProfileId]);
      }
    }
  };

  const renderItem = ({ item }: { item: ProfileType }) => {
    const isFollowing = followedIds.includes(item.id);
    return (
      <View style={styles.itemContainer}>
        <Text style={styles.username}>{item.username}</Text>
        <TouchableOpacity
          onPress={() => toggleFollow(item.id)}
          style={[styles.followButton, isFollowing && styles.followingButton]}
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
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header with back button and search bar */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back-outline" size={24} color="black" />
        </TouchableOpacity>
        <TextInput
          style={styles.searchInput}
          placeholder="Search profiles..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#000" style={styles.loader} />
      ) : (
        <FlatList
          data={profiles}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  backButton: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
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
  buttonText: {
    color: "#fff",
  },
  followingButtonText: {
    color: "#000",
  },
  loader: {
    marginTop: 20,
  },
});

export default Followers;
