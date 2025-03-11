import React, { useState, useEffect } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { supabase } from "@/utils/supabase";
import ProfileList, { ProfileType } from "@/components/ProfileList";

export default function FollowersScreen() {
  const [profiles, setProfiles] = useState<ProfileType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    const fetchProfiles = async () => {
      setLoading(true);
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) {
        console.error("Error fetching profiles:", error);
      } else if (data) {
        setProfiles(data);
      }
      setLoading(false);
    };
    fetchProfiles();
  }, []);

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
