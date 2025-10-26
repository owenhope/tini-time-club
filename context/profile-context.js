// ProfileContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "@/utils/supabase";
import authCache from "@/utils/authCache";
import { useRouter } from "expo-router";

// Create the context
const ProfileContext = createContext();

// Provider component that wraps your app and makes profile object available to any child component that calls useProfile().
export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Function to fetch the current user's profile from the "profile" table
  const fetchProfile = async () => {
    try {
      // Use cached profile if available
      const cachedProfile = await authCache.getProfile();

      if (cachedProfile) {
        setProfile(cachedProfile);
        setLoading(false);
        return;
      }

      // Fallback to direct fetch if cache miss
      const user = await authCache.getUser();
      if (!user) {
        console.error("No user found");
        setLoading(false);
        return;
      }

      // Query the "profile" table for this user's profile
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .eq("deleted", false)
        .single();

      if (error) {
        console.error("Error fetching profile", error);

        // Handle any profile fetch error - redirect to auth
        // Clear auth cache and redirect to login
        await authCache.invalidateCache();
        router.replace("/");
        return;
      } else {
        setProfile(data);
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error);

      // Handle any profile error (including from authCache) - redirect to auth
      if (error.message && error.message.includes("Profile fetch error")) {
        // Clear auth cache and redirect to login
        await authCache.invalidateCache();
        router.replace("/");
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch the profile when the provider mounts
  useEffect(() => {
    fetchProfile();
  }, []);

  // Function to update the profile (accepts an object with the fields to update)
  const updateProfile = async (updates) => {
    if (!profile) return;

    // Use cached update for better performance
    const result = await authCache.updateProfile(updates);

    if (result.error) {
      console.error("Error updating profile", result.error);
      return { error: result.error };
    }

    // Update local state
    setProfile(result.data);
    return { data: result.data };
  };

  // Function to force refresh the profile from database
  const refreshProfile = async () => {
    try {
      // Clear profile cache first
      await authCache.clearProfileCache();

      // Fetch fresh profile data
      await fetchProfile();
    } catch (error) {
      console.error("Error refreshing profile:", error);
    }
  };

  // Function to accept EULA
  const acceptEULA = async () => {
    try {
      if (!profile) {
        console.error("No profile found when trying to accept EULA");
        return { error: "No profile found" };
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          eula_accepted: true,
          eula_accepted_at: new Date().toISOString(),
        })
        .eq("id", profile.id)
        .select()
        .single();

      if (error) {
        console.error("Error accepting EULA", error);
        return { error };
      }

      // Update the profile state with the new data
      if (data) {
        setProfile(data);
      }

      return { data };
    } catch (err) {
      console.error("Unexpected error in acceptEULA:", err);
      return { error: err.message || "Unexpected error" };
    }
  };

  return (
    <ProfileContext.Provider
      value={{
        profile,
        setProfile,
        updateProfile,
        acceptEULA,
        refreshProfile,
        loading,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
};

// Custom hook for accessing the profile context
export const useProfile = () => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};
