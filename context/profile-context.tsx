import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
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
import { runExpectedSignOut } from "@/utils/authTelemetry";
import { routes } from "@/utils/routes";
import type { Profile } from "@/types/types";

interface ProfileResult {
  data?: Profile;
  error?: unknown;
}

export interface ProfileContextValue {
  /** The signed-in member, or null until the first fetch resolves. */
  profile: Profile | null;
  /** Whether Supabase currently has an authenticated session. */
  authenticated: boolean;
  /** Immediately invalidate member state while the sign-out request runs. */
  beginSignOut: () => void;
  setProfile: React.Dispatch<React.SetStateAction<Profile | null>>;
  updateProfile: (updates: Partial<Profile>) => Promise<ProfileResult>;
  acceptEULA: () => Promise<ProfileResult>;
  refreshProfile: () => Promise<void>;
  loading: boolean;
  /** A recoverable profile-read failure; the authenticated session is intact. */
  profileError: string | null;
}

export const PROFILE_LOAD_ERROR_MESSAGE =
  "We couldn't load your profile. Check your connection and try again.";

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
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  // A profile request can outlive the auth session that started it. In
  // particular, logout may finish while the initial cached/database read is
  // still resolving. Ignore results from that older auth generation so a
  // signed-out user cannot be put back into the member feed.
  const authGenerationRef = useRef(0);
  const router = useRouter();

  /**
   * The session is valid but the account behind it is gone. Sign out properly
   * (so the stale session can't keep failing every write) and explain why.
   */
  const handleAccountGone = useCallback(async () => {
    setProfile(null);
    setProfileError(null);
    await unregisterPushNotificationsAsync();
    await authCache.invalidateCache();
    // Explained to the member via the alert below; not an "unexpected" sign-out.
    const { error } = await runExpectedSignOut("account-gone", () =>
      supabase.auth.signOut()
    );
    if (error) {
      reportError("Error signing out unavailable account:", error);
      router.replace(routes.welcome());
    }
    Alert.alert("Signed out", ACCOUNT_GONE_MESSAGE);
  }, [router]);

  const beginSignOut = useCallback(() => {
    authGenerationRef.current += 1;
    setAuthenticated(false);
    setProfile(null);
    setProfileError(null);
  }, []);

  const fetchProfile = useCallback(async () => {
    const requestGeneration = authGenerationRef.current;
    const isCurrentRequest = () =>
      requestGeneration === authGenerationRef.current;

    try {
      const cachedProfile = await authCache.getProfile();
      if (cachedProfile) {
        if (!isCurrentRequest()) return;
        setAuthenticated(true);
        setProfile(cachedProfile);
        setProfileError(null);
        setLoading(false);
        return;
      }

      // No session yet: the provider now sits above the auth screens too, so
      // signed-out is a normal state here rather than a failure.
      const user = await authCache.getUser();
      if (!user) {
        if (!isCurrentRequest()) return;
        setAuthenticated(false);
        setProfileError(null);
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

        if (!isCurrentRequest()) return;

        if (isAccountGoneError(error)) {
          await handleAccountGone();
          return;
        }

        setProfileError(PROFILE_LOAD_ERROR_MESSAGE);
        return;
      }

      if (!isCurrentRequest()) return;
      setAuthenticated(true);
      setProfile(data);
      setProfileError(null);
    } catch (error) {
      reportError("Error in fetchProfile:", error);

      if (!isCurrentRequest()) return;

      if (isAccountGoneError(error)) {
        await handleAccountGone();
        return;
      }

      setProfileError(PROFILE_LOAD_ERROR_MESSAGE);
    } finally {
      if (isCurrentRequest()) setLoading(false);
    }
  }, [handleAccountGone]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        beginSignOut();
        setLoading(false);
        return;
      }

      if (event === "SIGNED_IN" && session) {
        authGenerationRef.current += 1;
        setAuthenticated(true);
        setLoading(true);
        setProfileError(null);
        void (async () => {
          await authCache.clearProfileCache();
          await fetchProfile();
        })();
      }
    });

    return () => subscription.unsubscribe();
  }, [beginSignOut, fetchProfile]);

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
      setLoading(true);
      await authCache.clearProfileCache();
      await fetchProfile();
    } catch (error) {
      reportError("Error refreshing profile:", error);
      setProfileError(PROFILE_LOAD_ERROR_MESSAGE);
      setLoading(false);
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
        authenticated,
        beginSignOut,
        setProfile,
        updateProfile,
        acceptEULA,
        refreshProfile,
        loading,
        profileError,
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
