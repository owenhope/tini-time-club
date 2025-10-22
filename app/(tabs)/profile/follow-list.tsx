import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/utils/supabase";
import ProfileList, { ProfileType } from "@/components/ProfileList";
import { useProfile } from "@/context/profile-context";
import { useRoute, useNavigation } from "@react-navigation/native";

type FollowType = "followers" | "following";

export default function FollowListScreen() {
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const { profile } = useProfile();
  const route = useRoute();
  const navigation = useNavigation();
  const type = (route.params as { type?: FollowType })?.type;

  // Set the title based on the type
  useEffect(() => {
    if (type) {
      const title = type === "followers" ? "Followers" : "Following";
      navigation.setOptions({ title });
    }
  }, [type, navigation]);

  useEffect(() => {
    const fetchFollowList = async () => {
      if (!profile?.id || !type) return;

      setLoading(true);
      try {
        let query;

        if (type === "followers") {
          // Get profiles that follow the current user
          query = supabase
            .from("followers")
            .select(
              `
                follower_id,
                profiles!followers_follower_id_fkey (
                  id,
                  username,
                  avatar_url
                )
              `
            )
            .eq("following_id", profile.id);
        } else {
          // Get profiles that the current user follows
          query = supabase
            .from("followers")
            .select(
              `
                following_id,
                profiles!followers_following_id_fkey (
                  id,
                  username,
                  avatar_url
                )
              `
            )
            .eq("follower_id", profile.id);
        }

        const { data, error } = await query;

        if (error) {
          console.error(`Error fetching ${type}:`, error);
        } else if (data) {
          // Extract the profile data from the join
          const followProfiles = data
            .map((item: any) => item.profiles)
            .filter(Boolean); // Remove any null profiles
          setProfiles(followProfiles);
        }
      } catch (error) {
        console.error(`Unexpected error fetching ${type}:`, error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowList();
  }, [profile?.id, type]);

  if (loading) {
    return (
      <ActivityIndicator size="large" color="#000" style={styles.loader} />
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
  loader: {
    marginTop: 20,
  },
});
