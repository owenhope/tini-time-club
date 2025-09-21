import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator, Text } from "react-native";
import { supabase } from "@/utils/supabase";
import ProfileList, { ProfileType } from "@/components/ProfileList";
import { useLocalSearchParams } from "expo-router";

export default function UserFollowingScreen() {
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const params = useLocalSearchParams();
  const username = params.username as string;

  useEffect(() => {
    const fetchFollowing = async () => {
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

        // Get all users this user is following
        const { data: followingData, error: followingError } = await supabase
          .from("followers")
          .select(
            `
            following_id,
            profiles!followers_following_id_fkey(
              id,
              username,
              avatar_url
            )
          `
          )
          .eq("follower_id", userProfile.id);

        if (followingError) {
          console.error("Error fetching following:", followingError);
          setLoading(false);
          return;
        }

        // Extract the profile data from the following
        const followingProfiles =
          followingData
            ?.map((following: any) => following.profiles)
            .filter(Boolean) || [];

        setProfiles(followingProfiles);
      } catch (error) {
        console.error("Unexpected error fetching following:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowing();
  }, [username]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
        <Text style={styles.loadingText}>Loading following...</Text>
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
