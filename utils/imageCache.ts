import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { reportError } from "./log";

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
  private readonly REVIEW_IMAGE_CACHE_DURATION = 90 * 60 * 1000; // 90 minutes (less than signed URL expiry of 2 hours)
  private readonly LOCATION_IMAGE_CACHE_DURATION = 12 * 60 * 60 * 1000; // 12 hours

  private constructor() {}

  static getInstance(): ImageCache {
    if (!ImageCache.instance) {
      ImageCache.instance = new ImageCache();
    }
    return ImageCache.instance;
  }

  /**
   * Avatar URL from a storage path. Public-bucket URLs are pure local string
   * construction — no I/O — so this is synchronous and safe to call in
   * render. Awaiting it in an effect forced every avatar through a blank
   * loading frame and an extra render.
   */
  getAvatarUrlSync(avatarPath: string | null): string | null {
    if (!avatarPath) return null;
    return supabase.storage.from("avatars").getPublicUrl(avatarPath).data
      .publicUrl;
  }

  /** @deprecated Use getAvatarUrlSync — this never did any async work. */
  async getAvatarUrl(avatarPath: string | null): Promise<string | null> {
    return this.getAvatarUrlSync(avatarPath);
  }

  /**
   * Get signed URL for review images with caching
   * Optimized: Removed slow URL validation check for better performance
   */
  async getReviewImageUrl(imagePath: string): Promise<string | null> {
    const cacheKey = `review_${imagePath}`;

    // Check memory cache first
    const cached = this.memoryCache.get(cacheKey) as CachedSignedUrl;
    if (cached && Date.now() < cached.expiresAt) {
      // Return cached URL immediately without validation (faster)
      // Return null if cached value is empty string (indicates missing image)
      return cached.signedUrl || null;
    }

    // Remove expired cache entry
    if (cached && Date.now() >= cached.expiresAt) {
      this.memoryCache.delete(cacheKey);
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

  private async fetchReviewImageUrl(
    imagePath: string,
    cacheKey: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from("review_images")
        .createSignedUrl(imagePath, 7200); // 2 hours server-side cache (longer = fewer API calls)

      if (error) {
        // Only log non-"not found" errors to reduce noise
        // "Object not found" is expected for deleted/missing images
        if (
          !error.message?.includes("not found") &&
          !error.message?.includes("Object not found")
        ) {
          reportError("Error creating signed URL:", error);
        }
        // Cache null result for missing images to avoid repeated failed requests
        const cached: CachedSignedUrl = {
          signedUrl: "",
          timestamp: Date.now(),
          expiresAt: Date.now() + this.REVIEW_IMAGE_CACHE_DURATION,
        };
        this.memoryCache.set(cacheKey, cached);
        return null;
      }

      const signedUrl = data.signedUrl;

      // Cache the result with shorter expiry to ensure we refresh before URL expires
      const cached: CachedSignedUrl = {
        signedUrl,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.REVIEW_IMAGE_CACHE_DURATION,
      };

      this.memoryCache.set(cacheKey, cached);
      await this.persistToStorage(cacheKey, cached);

      return signedUrl;
    } catch (error: any) {
      // Only log unexpected errors
      if (
        !error?.message?.includes("not found") &&
        !error?.message?.includes("Object not found")
      ) {
        reportError("Error fetching review image URL:", error);
      }
      return null;
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

  private async fetchLocationImage(
    locationId: string,
    cacheKey: string
  ): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from("location_images")
        .download(`${locationId}/image.jpg`);

      if (error) {
        if (
          error.message.includes("400") ||
          error.message.includes("The resource was not found")
        ) {
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
        expiresAt: Date.now() + this.LOCATION_IMAGE_CACHE_DURATION,
      };

      this.memoryCache.set(cacheKey, cached);
      await this.persistToStorage(cacheKey, cached);

      return dataUrl;
    } catch (error) {
      reportError("Error fetching location image:", error);
      return null;
    }
  }

  /**
   * Batch process multiple review images
   */
  async getReviewImageUrls(
    imagePaths: string[]
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    const uncachedPaths: string[] = [];

    // Check cache for all images first
    for (const path of imagePaths) {
      const cacheKey = `review_${path}`;
      const cached = this.memoryCache.get(cacheKey) as CachedSignedUrl;

      if (cached && Date.now() < cached.expiresAt) {
        // Empty string is the "missing image" sentinel — leave those out so
        // callers' `urls[path] || path` fallback stays on the raw path.
        if (cached.signedUrl) {
          results[path] = cached.signedUrl;
        }
      } else {
        uncachedPaths.push(path);
      }
    }

    // Sign all uncached paths in ONE storage API call — the previous
    // per-path createSignedUrl fan-out cost ~20 HTTPS round trips per feed
    // page before any photo could render.
    if (uncachedPaths.length > 0) {
      const uniquePaths = [...new Set(uncachedPaths)];
      try {
        const { data, error } = await supabase.storage
          .from("review_images")
          .createSignedUrls(uniquePaths, 7200);

        if (error) throw error;

        const now = Date.now();
        const toPersist: [string, string][] = [];

        for (const item of data ?? []) {
          const path = item.path;
          if (!path) continue;

          // Missing objects get the same empty sentinel as before, so a
          // deleted image doesn't trigger a re-fetch on every page load.
          const cached: CachedSignedUrl = {
            signedUrl: item.error ? "" : item.signedUrl,
            timestamp: now,
            expiresAt: now + this.REVIEW_IMAGE_CACHE_DURATION,
          };
          this.memoryCache.set(`review_${path}`, cached);
          toPersist.push([
            `image_cache_review_${path}`,
            JSON.stringify(cached),
          ]);

          if (!item.error) {
            results[path] = item.signedUrl;
          }
        }

        // One batched write instead of one setItem per image.
        if (toPersist.length > 0) {
          await AsyncStorage.multiSet(toPersist);
        }
      } catch (error) {
        reportError("Error batch-signing review image URLs:", error);
      }
    }

    return results;
  }

  /**
   * Persist cache to AsyncStorage
   */
  private async persistToStorage(
    key: string,
    data: CachedImage | CachedSignedUrl
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(`image_cache_${key}`, JSON.stringify(data));
    } catch (error) {
      reportError("Error persisting cache:", error);
    }
  }

  /**
   * Load cache from AsyncStorage on app start
   */
  async loadFromStorage(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((key) => key.startsWith("image_cache_"));
      if (cacheKeys.length === 0) return;

      // One multiGet rather than a sequential getItem per key. This runs on
      // every cold start, and the cache can hold hundreds of entries.
      const entries = await AsyncStorage.multiGet(cacheKeys);
      const expired: string[] = [];
      const now = Date.now();

      for (const [key, data] of entries) {
        if (!data) continue;
        try {
          const parsed = JSON.parse(data) as CachedImage | CachedSignedUrl;
          if (now < parsed.expiresAt) {
            this.memoryCache.set(key.replace("image_cache_", ""), parsed);
          } else {
            expired.push(key);
          }
        } catch (error) {
          reportError(`Error loading cache for ${key}:`, error);
          expired.push(key);
        }
      }

      if (expired.length > 0) {
        await AsyncStorage.multiRemove(expired);
      }
    } catch (error) {
      reportError("Error loading cache from storage:", error);
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
      const cacheKeys = keys.filter((key) => key.startsWith("image_cache_"));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      reportError("Error clearing cache:", error);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { memoryEntries: number; pendingRequests: number } {
    return {
      memoryEntries: this.memoryCache.size,
      pendingRequests: this.pendingRequests.size,
    };
  }
}

export default ImageCache.getInstance();
