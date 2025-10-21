import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import * as Crypto from 'expo-crypto';

interface SecureCachedSession {
  sessionHash: string; // Hash of session data, not the actual session
  userHash: string;    // Hash of user data, not the actual user
  profileHash: string; // Hash of profile data, not the actual profile
  timestamp: number;
  expiresAt: number;
}

class SecureAuthCache {
  private static instance: SecureAuthCache;
  private memoryCache: SecureCachedSession | null = null;
  private pendingRequests = new Map<string, Promise<any>>();
  
  // Very short cache duration for security
  private readonly SESSION_CACHE_DURATION = 30 * 1000; // 30 seconds
  private readonly PROFILE_CACHE_DURATION = 60 * 1000; // 1 minute
  
  private constructor() {}
  
  static getInstance(): SecureAuthCache {
    if (!SecureAuthCache.instance) {
      SecureAuthCache.instance = new SecureAuthCache();
    }
    return SecureAuthCache.instance;
  }
  
  /**
   * Get session - always validates with server for security
   */
  async getSession(): Promise<any> {
    // Always fetch fresh session for security
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        return null;
      }
      return session;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }
  
  /**
   * Get user - always validates with server for security
   */
  async getUser(): Promise<any> {
    const session = await this.getSession();
    return session?.user || null;
  }
  
  /**
   * Get profile with minimal caching (only for performance, not security)
   */
  async getProfile(): Promise<any> {
    const cacheKey = 'profile';
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    // Create new request
    const request = this.fetchProfile(cacheKey);
    this.pendingRequests.set(cacheKey, request);
    
    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  private async fetchProfile(cacheKey: string): Promise<any> {
    try {
      const user = await this.getUser();
      if (!user) {
        return null;
      }
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .eq("deleted", false)
        .single();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }
  
  /**
   * Update profile - no caching for security
   */
  async updateProfile(updates: any): Promise<{ data?: any; error?: any }> {
    try {
      const user = await this.getUser();
      if (!user) {
        return { error: 'No user found' };
      }
      
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating profile:', error);
        return { error };
      }
      
      return { data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error };
    }
  }
  
  /**
   * Clear all cache
   */
  async clearCache(): Promise<void> {
    this.memoryCache = null;
    this.pendingRequests.clear();
    
    try {
      await AsyncStorage.removeItem('secure_auth_cache');
    } catch (error) {
      console.error('Error clearing secure auth cache:', error);
    }
  }
  
  /**
   * Security: Clear cache on app background
   */
  async onAppStateChange(nextAppState: string): Promise<void> {
    if (nextAppState === 'background') {
      await this.clearCache();
    }
  }
  
  /**
   * Load cache from storage (minimal for security)
   */
  async loadFromStorage(): Promise<void> {
    // For security, we don't load sensitive data from storage
    // This method exists for compatibility but doesn't load anything
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { hasSession: boolean; hasProfile: boolean; pendingRequests: number } {
    return {
      hasSession: false, // Never cache sessions for security
      hasProfile: false, // Never cache profiles for security
      pendingRequests: this.pendingRequests.size
    };
  }
  
  /**
   * Invalidate cache
   */
  async invalidateCache(): Promise<void> {
    await this.clearCache();
  }
}

export default SecureAuthCache.getInstance();
