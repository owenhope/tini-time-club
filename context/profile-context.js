// ProfileContext.js
import React, { createContext, useState, useEffect, useContext } from "react";
import { supabase } from "@/utils/supabase";

// Create the context
const ProfileContext = createContext();

// Provider component that wraps your app and makes profile object available to any child component that calls useProfile().
export const ProfileProvider = ({ children }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch the current user's profile from the "profile" table
  const fetchProfile = async () => {
    // Get the authenticated user from Supabase
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Error fetching user", userError);
      setLoading(false);
      return;
    }

    // Query the "profile" table for this user’s profile
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile", error);
    } else {
      setProfile(data);
    }
    setLoading(false);
  };

  // Fetch the profile when the provider mounts
  useEffect(() => {
    fetchProfile();
  }, []);

  // Function to update the profile (accepts an object with the fields to update)
  const updateProfile = async (updates) => {
    if (!profile) return;
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", profile.id)
      .single();

    if (error) {
      console.error("Error updating profile", error);
      return { error };
    }

    setProfile(data);
    return { data };
  };

  return (
    <ProfileContext.Provider
      value={{ profile, setProfile, updateProfile, loading }}
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
