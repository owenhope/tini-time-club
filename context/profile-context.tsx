import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { Alert } from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import authCache from "@/utils/authCache";
import { unregisterPushNotificationsAsync } from "@/services/pushNotificationService";
import {
  isAccountGoneError,
  ACCOUNT_GONE_MESSAGE,
} from "@/utils/accountErrors";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import type { Profile } from "@/types/types";

interface ProfileResult {
  data?: Profile;
  error?: unknown;
}

export interface ProfileContextValue {
  /** The signed-in member, or null until the first fetch resolves. */
  profile: Profile | null;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  updateProfile: (updates: Partial<Profile>) => Promise<ProfileResult>;
  acceptEULA: () => Promise<ProfileResult>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(
  undefined
);

/**
 * The signed-in member, and the three writes every screen makes against them.
 *
 * Reads go through authCache, which serves a cached profile when it has one;
 * a miss falls back to a direct query. A profile that has been deleted out
 * from under a live session signs the member out rather than letting every
 * subsequent write fail.
 */
export const ProfileProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  /**
   * The session is valid but the account behind it is gone. Sign out properly
   * (so the stale session can't keep failing every write) and explain why.
   */
  const handleAccountGone = useCallback(async () => {
    setProfile(null);
    await unregisterPushNotificationsAsync();
    await authCache.invalidateCache();
    await supabase.auth.signOut();
    router.replace(routes.welcome());
    Alert.alert("Signed out", ACCOUNT_GONE_MESSAGE);
  }, [router]);

  const fetchProfile = useCallback(async () => {
    try {
      const cachedProfile = await authCache.getProfile();
      if (cachedProfile) {
        setProfile(cachedProfile);
        setLoading(false);
        return;
      }

      // No session yet: the provider now sits above the auth screens too, so
      // signed-out is a normal state here rather than a failure.
      const user = await authCache.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .eq("deleted", false)
        .single();

      if (error) {
        reportError("Error fetching profile:", error);

        if (isAccountGoneError(error)) {
          await handleAccountGone();
          return;
        }

        // Any other profile fetch error: fall back to the auth screen.
        await authCache.invalidateCache();
        router.replace(routes.welcome());
        return;
      }

      setProfile(data);
    } catch (error) {
      reportError("Error in fetchProfile:", error);

      if (isAccountGoneError(error)) {
        await handleAccountGone();
        return;
      }

      const message = error instanceof Error ? error.message : "";
      if (message.includes("Profile fetch error")) {
        await authCache.invalidateCache();
        router.replace(routes.welcome());
      }
    } finally {
      setLoading(false);
    }
  }, [handleAccountGone, router]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" && session) {
        setLoading(true);
        void (async () => {
          await authCache.clearProfileCache();
          await fetchProfile();
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (updates: Partial<Profile>): Promise<ProfileResult> => {
      if (!profile) return {};

      const result = await authCache.updateProfile(updates);

      if (result.error) {
        reportError("Error updating profile:", result.error);
        if (isAccountGoneError(result.error)) {
          await handleAccountGone();
        }
        return { error: result.error };
      }

      setProfile(result.data);
      return { data: result.data };
    },
    [profile, handleAccountGone]
  );

  const refreshProfile = useCallback(async () => {
    try {
      await authCache.clearProfileCache();
      await fetchProfile();
    } catch (error) {
      reportError("Error refreshing profile:", error);
    }
  }, [fetchProfile]);

  const acceptEULA = useCallback(async (): Promise<ProfileResult> => {
    try {
      if (!profile) {
        reportError("No profile found when trying to accept the EULA");
        return { error: "No profile found" };
      }

      const { data, error } = await authCache.updateProfile({
        eula_accepted: true,
        eula_accepted_at: new Date().toISOString(),
      });

      if (error) {
        reportError("Error accepting the EULA:", error);
        return { error };
      }

      if (data) setProfile(data);
      return { data };
    } catch (error) {
      reportError("Unexpected error in acceptEULA:", error);
      return {
        error: error instanceof Error ? error.message : "Unexpected error",
      };
    }
  }, [profile]);

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

export const useProfile = (): ProfileContextValue => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error("useProfile must be used within a ProfileProvider");
  }
  return context;
};
