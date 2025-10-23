import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

interface CachedImage {
  url: string;
  timestamp: number;
  expiresAt: number;
}

interface CachedSignedUrl {
  signedUrl: string;
  timestamp: number;
  expiresAt: number;
}

class ImageCache {
  private static instance: ImageCache;
  private memoryCache = new Map<string, CachedImage | CachedSignedUrl>();
  private pendingRequests = new Map<string, Promise<string | null>>();
  
  // Cache durations (in milliseconds)
  private readonly AVATAR_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
  private readonly REVIEW_IMAGE_CACHE_DURATION = 45 * 60 * 1000; // 45 minutes (less than signed URL expiry)
  private readonly LOCATION_IMAGE_CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours
  
  private constructor() {}
  
  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }
  
  /**
   * Get avatar URL without caching (always fresh)
   */
  async getAvatarUrl(avatarPath: string | null): Promise<string | null> {
    if (!avatarPath) return null;
    
    try {
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(avatarPath);
      
      const url = data.publicUrl;
      return url;
    } catch (error) {
      console.error('Error fetching avatar URL:', error);
      return null;
    }
  }
  
  private async fetchAvatarUrl(avatarPath: string, cacheKey: string): Promise<string> {
    try {
      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(avatarPath);
      
      const url = data.publicUrl;
      
      // Cache the result
      const cached: CachedImage = {
        url,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.AVATAR_CACHE_DURATION
      };
      
      this.memoryCache.set(cacheKey, cached);
      await this.persistToStorage(cacheKey, cached);
      
      return url;
    } catch (error) {
      console.error('Error fetching avatar URL:', error);
      throw error;
    }
  }
  
  /**
   * Get signed URL for review images with caching
   */
  async getReviewImageUrl(imagePath: string): Promise<string | null> {
    const cacheKey = `review_${imagePath}`;
    
    // Check memory cache first
    const cached = this.memoryCache.get(cacheKey) as CachedSignedUrl;
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        // Validate the URL is still working
        const isValid = await this.isUrlValid(cached.signedUrl);
        if (isValid) {
          return cached.signedUrl;
        } else {
          // URL is invalid, remove from cache and fetch new one
          this.memoryCache.delete(cacheKey);
        }
      } else {
        // Remove expired cache entry
        this.memoryCache.delete(cacheKey);
      }
    }
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }
    
    // Create new request
    const request = this.fetchReviewImageUrl(imagePath, cacheKey);
    this.pendingRequests.set(cacheKey, request as Promise<string | null>);
    
    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  private async fetchReviewImageUrl(imagePath: string, cacheKey: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from("review_images")
        .createSignedUrl(imagePath, 3600); // 1 hour server-side cache
      
      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }
      
      const signedUrl = data.signedUrl;
      
      // Cache the result with shorter expiry to ensure we refresh before URL expires
      const cached: CachedSignedUrl = {
        signedUrl,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.REVIEW_IMAGE_CACHE_DURATION
      };
      
      this.memoryCache.set(cacheKey, cached);
      await this.persistToStorage(cacheKey, cached);
      
      return signedUrl;
    } catch (error) {
      console.error('Error fetching review image URL:', error);
      return null;
    }
  }

  /**
   * Check if a URL is still valid by making a HEAD request
   */
  private async isUrlValid(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get location image with caching
   */
  async getLocationImage(locationId: string): Promise<string | null> {
    const cacheKey = `location_${locationId}`;
    
    // Check memory cache first
    const cached = this.memoryCache.get(cacheKey) as CachedImage;
    if (cached) {
      if (Date.now() < cached.expiresAt) {
        return cached.url;
      } else {
        // Remove expired cache entry
        this.memoryCache.delete(cacheKey);
      }
    }
    
    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }
    
    // Create new request
    const request = this.fetchLocationImage(locationId, cacheKey);
    this.pendingRequests.set(cacheKey, request);
    
    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }
  
  private async fetchLocationImage(locationId: string, cacheKey: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from("location_images")
        .download(`${locationId}/image.jpg`);
      
      if (error) {
        if (error.message.includes("400") || error.message.includes("The resource was not found")) {
          return null;
        }
        throw error;
      }
      
      if (!data) return null;
      
      // Convert blob to data URL
      const fr = new FileReader();
      const dataUrl = await new Promise<string>((resolve, reject) => {
        fr.onload = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(data);
      });
      
      // Cache the result
      const cached: CachedImage = {
        url: dataUrl,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.LOCATION_IMAGE_CACHE_DURATION
      };
      
      this.memoryCache.set(cacheKey, cached);
      await this.persistToStorage(cacheKey, cached);
      
      return dataUrl;
    } catch (error) {
      console.error('Error fetching location image:', error);
      return null;
    }
  }
  
  /**
   * Batch process multiple review images
   */
  async getReviewImageUrls(imagePaths: string[]): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const uncachedPaths: string[] = [];
    
    // Check cache for all images first
    for (const path of imagePaths) {
      const cacheKey = `review_${path}`;
      const cached = this.memoryCache.get(cacheKey) as CachedSignedUrl;
      
      if (cached && Date.now() < cached.expiresAt) {
        results[path] = cached.signedUrl;
      } else {
        uncachedPaths.push(path);
      }
    }
    
    // Fetch uncached images in parallel
    if (uncachedPaths.length > 0) {
      const promises = uncachedPaths.map(async (path) => {
        try {
          const url = await this.getReviewImageUrl(path);
          return { path, url };
        } catch (error) {
          console.error(`Error fetching image ${path}:`, error);
          return { path, url: null };
        }
      });
      
      const fetchedResults = await Promise.all(promises);
      
      for (const { path, url } of fetchedResults) {
        if (url) {
          results[path] = url;
        }
      }
    }
    
    return results;
  }
  
  /**
   * Persist cache to AsyncStorage
   */
  private async persistToStorage(key: string, data: CachedImage | CachedSignedUrl): Promise<void> {
    try {
      await AsyncStorage.setItem(`image_cache_${key}`, JSON.stringify(data));
    } catch (error) {
      console.error('Error persisting cache:', error);
    }
  }
  
  /**
   * Load cache from AsyncStorage on app start
   */
  async loadFromStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('image_cache_'));
      
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data) as CachedImage | CachedSignedUrl;
            
            // Only load if not expired
            if (Date.now() < parsed.expiresAt) {
              const cacheKey = key.replace('image_cache_', '');
              this.memoryCache.set(cacheKey, parsed);
            } else {
              // Remove expired entries
              await AsyncStorage.removeItem(key);
            }
          }
        } catch (error) {
          console.error(`Error loading cache for ${key}:`, error);
        }
      }
    } catch (error) {
      console.error('Error loading cache from storage:', error);
    }
  }
  
  /**
   * Clear avatar cache for a specific avatar path
   */
  async clearAvatarCache(avatarPath: string): Promise<void> {
    const cacheKey = `avatar_${avatarPath}`;
    
    // Remove from memory cache
    this.memoryCache.delete(cacheKey);
    
    // Remove from AsyncStorage
    try {
      await AsyncStorage.removeItem(`image_cache_${cacheKey}`);
    } catch (error) {
      console.error('Error clearing avatar cache:', error);
    }
  }

  /**
   * Clear all avatar caches for a specific user
   */
  async clearUserAvatarCache(userId: string): Promise<void> {
    try {
      // Get all cache keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const avatarCacheKeys = keys.filter(key => 
        key.startsWith('image_cache_avatar_') && key.includes(userId)
      );
      
      // Remove from AsyncStorage
      if (avatarCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(avatarCacheKeys);
      }
      
      // Remove from memory cache
      const memoryKeysToDelete: string[] = [];
      for (const [key, value] of this.memoryCache.entries()) {
        if (key.startsWith('avatar_') && key.includes(userId)) {
          memoryKeysToDelete.push(key);
        }
      }
      
      memoryKeysToDelete.forEach(key => {
        this.memoryCache.delete(key);
      });
    } catch (error) {
      console.error('Error clearing user avatar cache:', error);
    }
  }

  /**
   * Clear all avatar caches (more aggressive approach)
   */
  async clearAllAvatarCaches(): Promise<void> {
    try {
      // Get all cache keys from AsyncStorage
      const keys = await AsyncStorage.getAllKeys();
      const avatarCacheKeys = keys.filter(key => 
        key.startsWith('image_cache_avatar_')
      );
      
      // Remove from AsyncStorage
      if (avatarCacheKeys.length > 0) {
        await AsyncStorage.multiRemove(avatarCacheKeys);
      }
      
      // Remove from memory cache
      const memoryKeysToDelete: string[] = [];
      for (const [key, value] of this.memoryCache.entries()) {
        if (key.startsWith('avatar_')) {
          memoryKeysToDelete.push(key);
        }
      }
      
      memoryKeysToDelete.forEach(key => {
        this.memoryCache.delete(key);
      });
    } catch (error) {
      console.error('Error clearing all avatar caches:', error);
    }
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    this.memoryCache.clear();
    this.pendingRequests.clear();
    
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('image_cache_'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear expired cache entries
   */
  async clearExpiredCache(): Promise<void> {
    const now = Date.now();
    const expiredKeys: string[] = [];
    
    // Clear expired memory cache entries
    for (const [key, cached] of this.memoryCache.entries()) {
      if (now >= cached.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.memoryCache.delete(key));
    
    // Clear expired storage entries
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith('image_cache_'));
      const expiredStorageKeys: string[] = [];
      
      for (const key of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(key);
          if (data) {
            const parsed = JSON.parse(data) as CachedImage | CachedSignedUrl;
            if (now >= parsed.expiresAt) {
              expiredStorageKeys.push(key);
            }
          }
        } catch (error) {
          // If we can't parse the data, remove it
          expiredStorageKeys.push(key);
        }
      }
      
      if (expiredStorageKeys.length > 0) {
        await AsyncStorage.multiRemove(expiredStorageKeys);
      }
    } catch (error) {
      console.error('Error clearing expired cache:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { memoryEntries: number; pendingRequests: number } {
    return {
      memoryEntries: this.memoryCache.size,
      pendingRequests: this.pendingRequests.size
    };
  }
}

export default ImageCache.getInstance();
