import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

interface CachedSession {
  session: any;
  user: any;
  profile: any;
  timestamp: number;
  expiresAt: number;
}

class AuthCache {
  private static instance: AuthCache;
  private memoryCache: CachedSession | null = null;
  private pendingRequests = new Map<string, Promise<any>>();
  
  // Cache duration (in milliseconds) - Conservative for security
  private readonly SESSION_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (reduced for security)
  private readonly PROFILE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes (reduced for security)
  
  private constructor() {}
  
  static getInstance(): AuthCache {
    if (!AuthCache.instance) {
      AuthCache.instance = new AuthCache();
    }
    return AuthCache.instance;
  }
  
  /**
   * Get cached session or fetch from Supabase
   * Always validates with server for security
   */
  async getSession(): Promise<any> {
    const cacheKey = 'session';
    
    // Check memory cache first
    if (this.memoryCache && Date.now() < this.memoryCache.expiresAt) {
      // For security, always validate session with server
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          // Session invalid, clear cache
          await this.invalidateCache();
          return null;
        }
        return session;
      } catch (error) {
        console.error('Session validation failed:', error);
        await this.invalidateCache();
        return null;
      }
    }
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }
    
    // Create new request
    const request = this.fetchSession(cacheKey);
    this.pendingRequests.set(cacheKey, request);
    
    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  private async fetchSession(cacheKey: string): Promise<any> {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error fetching session:', error);
        return null;
      }
      
      // Cache the session
      if (session) {
        const cached: CachedSession = {
          session,
          user: session.user,
          profile: null, // Will be fetched separately if needed
          timestamp: Date.now(),
          expiresAt: Date.now() + this.SESSION_CACHE_DURATION
        };
        
        this.memoryCache = cached;
        await this.persistToStorage('auth_cache', cached);
      }
      
      return session;
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }
  
  /**
   * Get cached user or fetch from session
   */
  async getUser(): Promise<any> {
    // Check memory cache first
    if (this.memoryCache && Date.now() < this.memoryCache.expiresAt) {
      return this.memoryCache.user;
    }
    
    const session = await this.getSession();
    return session?.user || null;
  }
  
  /**
   * Get cached profile or fetch from database
   */
  async getProfile(): Promise<any> {
    const cacheKey = 'profile';
    
    // Check memory cache first
    if (this.memoryCache && this.memoryCache.profile && Date.now() < this.memoryCache.expiresAt) {
      return this.memoryCache.profile;
    }
    
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
      
      // Update cache with profile
      if (this.memoryCache) {
        this.memoryCache.profile = data;
        this.memoryCache.expiresAt = Date.now() + this.PROFILE_CACHE_DURATION;
        await this.persistToStorage('auth_cache', this.memoryCache);
      }
      
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  }
  
  /**
   * Update profile in cache
   */
  async updateProfile(updates: any): Promise<{ data?: any; error?: any }> {
    try {
      if (!this.memoryCache?.profile) {
        return { error: 'No profile in cache' };
      }
      
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", this.memoryCache.profile.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating profile:', error);
        return { error };
      }
      
      // Update cache
      if (this.memoryCache) {
        this.memoryCache.profile = data;
        this.memoryCache.expiresAt = Date.now() + this.PROFILE_CACHE_DURATION;
        await this.persistToStorage('auth_cache', this.memoryCache);
      }
      
      return { data };
    } catch (error) {
      console.error('Error updating profile:', error);
      return { error };
    }
  }
  
  /**
   * Clear all auth cache
   */
  async clearCache(): Promise<void> {
    this.memoryCache = null;
    this.pendingRequests.clear();
    
    try {
      await AsyncStorage.removeItem('auth_cache');
    } catch (error) {
      console.error('Error clearing auth cache:', error);
    }
  }
  
  /**
   * Security: Clear cache on app background/foreground
   */
  async onAppStateChange(nextAppState: string): Promise<void> {
    if (nextAppState === 'background') {
      // Clear sensitive data when app goes to background
      this.memoryCache = null;
      await AsyncStorage.removeItem('auth_cache');
    }
  }
  
  /**
   * Security: Check if cache is expired and clear if needed
   */
  private isCacheExpired(): boolean {
    if (!this.memoryCache) return true;
    return Date.now() >= this.memoryCache.expiresAt;
  }
  
  /**
   * Security: Clear cache if expired
   */
  private async clearIfExpired(): Promise<void> {
    if (this.isCacheExpired()) {
      await this.clearCache();
    }
  }
  
  /**
   * Load cache from storage on app start
   */
  async loadFromStorage(): Promise<void> {
    try {
      const data = await AsyncStorage.getItem('auth_cache');
      if (data) {
        const cached = JSON.parse(data) as CachedSession;
        
        // Only load if not expired
        if (Date.now() < cached.expiresAt) {
          this.memoryCache = cached;
        } else {
          // Clear expired cache
          await this.clearCache();
        }
      }
    } catch (error) {
      console.error('Error loading auth cache:', error);
    }
  }
  
  /**
   * Persist cache to storage
   */
  private async persistToStorage(key: string, data: CachedSession): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error('Error persisting auth cache:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { hasSession: boolean; hasProfile: boolean; pendingRequests: number } {
    return {
      hasSession: !!(this.memoryCache?.session),
      hasProfile: !!(this.memoryCache?.profile),
      pendingRequests: this.pendingRequests.size
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
