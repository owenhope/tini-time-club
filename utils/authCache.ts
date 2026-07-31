import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase, supabaseProjectRef } from "./supabase";
import { reportError } from "./log";

interface CachedProfile {
  profile: any;
  timestamp: number;
  expiresAt: number;
  version: number;
}

const LEGACY_PROFILE_CACHE_KEY = "profile_cache";
const PROFILE_CACHE_KEY = `profile_cache_${supabaseProjectRef}`;
const PROFILE_CACHE_VERSION = 2;
// Legacy key that used to hold the full session (access + refresh tokens) in
// plaintext AsyncStorage. Always removed on startup.
const LEGACY_AUTH_CACHE_KEY = "auth_cache";

/**
 * Profile cache. Sessions and users are NOT cached here — supabase-js is the
 * single source of session truth (persisted encrypted via LargeSecureStore in
 * ./supabase.ts, with its own auto-refresh).
 */
class AuthCache {
  private static instance: AuthCache;
  private profileCache: CachedProfile | null = null;
  private pendingRequests = new Map<string, Promise<any>>();

  private readonly PROFILE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  private constructor() {}

  static getInstance(): AuthCache {
    if (!AuthCache.instance) {
      AuthCache.instance = new AuthCache();
    }
    return AuthCache.instance;
  }

  /**
   * Get the current session from supabase-js (refreshes automatically when
   * expired). Kept for API compatibility with existing callers.
   */
  async getSession(): Promise<any> {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      reportError("Error fetching session:", error);
      return null;
    }
    return session;
  }

  /**
   * Get the current user from the session.
   */
  async getUser(): Promise<any> {
    const session = await this.getSession();
    return session?.user || null;
  }

  /**
   * Get cached profile or fetch from database
   */
  async getProfile(): Promise<any> {
    const cacheKey = "profile";
    const user = await this.getUser();
    if (!user) return null;

    if (
      this.profileCache &&
      this.profileCache.profile?.id === user.id &&
      Date.now() < this.profileCache.expiresAt &&
      this.profileCache.version === PROFILE_CACHE_VERSION &&
      Object.prototype.hasOwnProperty.call(
        this.profileCache.profile,
        "is_verified"
      )
    ) {
      return this.profileCache.profile;
    }

    if (this.profileCache?.profile?.id !== user.id) {
      await this.clearProfileCache();
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    const request = this.fetchProfile(user.id);
    this.pendingRequests.set(cacheKey, request);

    try {
      return await request;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private async fetchProfile(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .eq("deleted", false)
        .single();

      if (error) {
        reportError("Error fetching profile:", error);
        // Throw error to be handled by calling code
        throw new Error(`Profile fetch error: ${error.code || error.message}`);
      }

      await this.setProfile(data);
      return data;
    } catch (error) {
      reportError("Error fetching profile:", error);
      return null;
    }
  }

  private async setProfile(profile: any): Promise<void> {
    this.profileCache = {
      profile,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.PROFILE_CACHE_DURATION,
      version: PROFILE_CACHE_VERSION,
    };
    try {
      await AsyncStorage.setItem(
        PROFILE_CACHE_KEY,
        JSON.stringify(this.profileCache)
      );
    } catch (error) {
      reportError("Error persisting profile cache:", error);
    }
  }

  /**
   * Update profile in the database and refresh the cache
   */
  async updateProfile(updates: any): Promise<{ data?: any; error?: any }> {
    try {
      const user = await this.getUser();
      const profileId = this.profileCache?.profile?.id ?? user?.id;
      if (!profileId) {
        return { error: "No profile to update" };
      }

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", profileId)
        .select()
        .single();

      if (error) {
        reportError("Error updating profile:", error);
        return { error };
      }

      await this.setProfile(data);
      return { data };
    } catch (error) {
      reportError("Error updating profile:", error);
      return { error };
    }
  }

  /**
   * Clear profile cache to force fresh profile data
   */
  async clearProfileCache(): Promise<void> {
    this.profileCache = null;
    this.pendingRequests.delete("profile");
    try {
      await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
    } catch (error) {
      reportError("Error clearing profile cache:", error);
    }
  }

  /**
   * Clear all cached data
   */
  async clearCache(): Promise<void> {
    this.pendingRequests.clear();
    await this.clearProfileCache();
  }

  /**
   * Handle app state changes. Sessions are managed by supabase-js; nothing to do.
   */
  async onAppStateChange(_nextAppState: string): Promise<void> {}

  /**
   * Load cached profile from storage on app start, and scrub the legacy
   * plaintext session cache if present.
   */
  async loadFromStorage(): Promise<void> {
    try {
      // Remove the legacy cache that stored tokens in plaintext.
      await AsyncStorage.removeItem(LEGACY_AUTH_CACHE_KEY);
      await AsyncStorage.removeItem(LEGACY_PROFILE_CACHE_KEY);

      const data = await AsyncStorage.getItem(PROFILE_CACHE_KEY);
      if (data) {
        const cached = JSON.parse(data) as CachedProfile;
        if (
          Date.now() < cached.expiresAt &&
          cached.profile &&
          cached.version === PROFILE_CACHE_VERSION &&
          Object.prototype.hasOwnProperty.call(cached.profile, "is_verified")
        ) {
          this.profileCache = cached;
        } else {
          await AsyncStorage.removeItem(PROFILE_CACHE_KEY);
        }
      }
    } catch (error) {
      reportError("Error loading profile cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    hasSession: boolean;
    hasProfile: boolean;
    pendingRequests: number;
  } {
    return {
      hasSession: false, // sessions are no longer cached here
      hasProfile: !!this.profileCache?.profile,
      pendingRequests: this.pendingRequests.size,
    };
  }

  /**
   * Invalidate cache (useful after sign out)
   */
  async invalidateCache(): Promise<void> {
    await this.clearCache();
  }
}

export default AuthCache.getInstance();
