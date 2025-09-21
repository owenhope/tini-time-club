import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { supabase } from "@/utils/supabase";
import ProfileList, { ProfileType } from "@/components/ProfileList";
import { useLocalSearchParams } from "expo-router";

export default function UserFollowersScreen() {
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const params = useLocalSearchParams();
  const username = params.username as string;

  useEffect(() => {
    const fetchFollowers = async () => {
      if (!username) return;

      setLoading(true);
      try {
        // First get the user's profile to get their ID
        const { data: userProfile, error: userError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", username)
          .eq("deleted", false)
          .single();

        if (userError || !userProfile) {
          console.error("Error fetching user profile:", userError);
          setLoading(false);
          return;
        }

        // Get all followers of this user
        const { data: followersData, error: followersError } = await supabase
          .from("followers")
          .select(
            `
            follower_id,
            profiles!followers_follower_id_fkey(
              id,
              username,
              avatar_url
            )
          `
          )
          .eq("following_id", userProfile.id);

        if (followersError) {
          console.error("Error fetching followers:", followersError);
          setLoading(false);
          return;
        }

        // Extract the profile data from the followers
        const followerProfiles =
          followersData
            ?.map((follower: any) => follower.profiles)
            .filter(Boolean) || [];

        setProfiles(followerProfiles);
      } catch (error) {
        console.error("Unexpected error fetching followers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [username]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading followers...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ProfileList profiles={profiles} enableSearch={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
});
