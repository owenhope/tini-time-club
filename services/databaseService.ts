import { supabase } from '@/utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CachedQuery {
  data: any;
  timestamp: number;
  expiresAt: number;
}

interface QueryOptions {
  cache?: boolean;
  cacheDuration?: number; // in milliseconds
  forceRefresh?: boolean;
}

class DatabaseService {
  private static instance: DatabaseService;
  private queryCache = new Map<string, CachedQuery>();
  private pendingQueries = new Map<string, Promise<any>>();
  
  // Default cache durations (in milliseconds)
  private readonly DEFAULT_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly STATIC_DATA_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes (types, spirits)
  private readonly USER_DATA_CACHE_DURATION = 2 * 60 * 1000; // 2 minutes (profiles, reviews)
  
  private constructor() {}
  
  static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }
  
  /**
   * Generic query method with caching
   */
  private async query<T>(
    queryKey: string,
    queryFn: () => Promise<T>,
    options: QueryOptions = {}
  ): Promise<T> {
    const {
      cache = true,
      cacheDuration = this.DEFAULT_CACHE_DURATION,
      forceRefresh = false
    } = options;
    
    // Check cache first (unless force refresh)
    if (cache && !forceRefresh) {
      const cached = this.queryCache.get(queryKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }
    }
    
    // Check if query is already pending
    if (this.pendingQueries.has(queryKey)) {
      return this.pendingQueries.get(queryKey)!;
    }
    
    // Execute query
    const queryPromise = queryFn();
    this.pendingQueries.set(queryKey, queryPromise);
    
    try {
      const result = await queryPromise;
      
      // Cache the result
      if (cache) {
        this.queryCache.set(queryKey, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + cacheDuration
        });
      }
      
      return result;
    } finally {
      this.pendingQueries.delete(queryKey);
    }
  }
  
  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<any> {
    return this.query(
      `profile_${userId}`,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .eq('deleted', false)
          .single();
        
        if (error) throw error;
        return data;
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: any): Promise<any> {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Invalidate cache
    this.queryCache.delete(`profile_${userId}`);
    
    return data;
  }
  
  /**
   * Get reviews with optimized joins
   */
  async getReviews(options: {
    userId?: string;
    locationId?: string;
    limit?: number;
    offset?: number;
    excludeBlocked?: boolean;
    currentUserId?: string;
  } = {}): Promise<any[]> {
    const {
      userId,
      locationId,
      limit = 20,
      offset = 0,
      excludeBlocked = true,
      currentUserId
    } = options;
    
    const cacheKey = `reviews_${JSON.stringify(options)}`;
    
    return this.query(
      cacheKey,
      async () => {
        // Get blocked user IDs if needed
        let blockedIds: string[] = [];
        if (excludeBlocked && currentUserId) {
          blockedIds = await this.getBlockedUserIds(currentUserId);
        }
        
        // Build query
        let query = supabase
          .from('reviews')
          .select(`
            id,
            comment,
            image_url,
            inserted_at,
            taste,
            presentation,
            user_id,
            location:locations!reviews_location_fkey(id, name, address),
            spirit:spirit(name),
            type:type(name),
            profile:profiles!user_id(id, username, avatar_url)
          `)
          .eq('state', 1)
          .not('profile.deleted', 'eq', true)
          .order('inserted_at', { ascending: false })
          .range(offset, offset + limit - 1);
        
        // Apply filters
        if (userId) {
          query = query.eq('user_id', userId);
        }
        if (locationId) {
          query = query.eq('location', locationId);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Filter out blocked users
        if (excludeBlocked && blockedIds.length > 0) {
          return data.filter((review: any) => !blockedIds.includes(review.user_id));
        }
        
        return data;
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Get followed user IDs
   */
  async getFollowedUserIds(userId: string): Promise<string[]> {
    return this.query(
      `followed_${userId}`,
      async () => {
        const { data, error } = await supabase
          .from('followers')
          .select('following_id')
          .eq('follower_id', userId);
        
        if (error) throw error;
        return data.map((row: any) => row.following_id);
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Get blocked user IDs
   */
  async getBlockedUserIds(userId: string): Promise<string[]> {
    return this.query(
      `blocked_${userId}`,
      async () => {
        const { data, error } = await supabase
          .from('blocks')
          .select('blocked_id')
          .eq('blocker_id', userId);
        
        if (error) throw error;
        return data.map((row: any) => row.blocked_id);
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Get spirits (static data - long cache)
   */
  async getSpirits(): Promise<any[]> {
    return this.query(
      'spirits',
      async () => {
        const { data, error } = await supabase
          .from('spirits')
          .select('*');
        
        if (error) throw error;
        return data;
      },
      { cacheDuration: this.STATIC_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Get types (static data - long cache)
   */
  async getTypes(): Promise<any[]> {
    return this.query(
      'types',
      async () => {
        const { data, error } = await supabase
          .from('types')
          .select('*');
        
        if (error) throw error;
        return data;
      },
      { cacheDuration: this.STATIC_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Get locations with reviews
   */
  async getLocationsWithReviews(searchQuery?: string, limit: number = 20): Promise<any[]> {
    const cacheKey = `locations_${searchQuery || 'all'}`;
    
    return this.query(
      cacheKey,
      async () => {
        let query = supabase
          .from('locations')
          .select(`
            id,
            name,
            address,
            reviews!reviews_location_fkey(
              taste,
              presentation,
              state
            )
          `)
          .eq('reviews.state', 1)
          .limit(limit);
        
        if (searchQuery) {
          query = query.ilike('name', `%${searchQuery}%`);
        }
        
        const { data, error } = await query;
        if (error) throw error;
        
        // Process data to calculate averages
        return data.map((location: any) => {
          const activeReviews = location.reviews.filter((r: any) => r.state === 1);
          const avgTaste = activeReviews.length > 0 
            ? activeReviews.reduce((sum: number, r: any) => sum + r.taste, 0) / activeReviews.length 
            : 0;
          const avgPresentation = activeReviews.length > 0 
            ? activeReviews.reduce((sum: number, r: any) => sum + r.presentation, 0) / activeReviews.length 
            : 0;
          
          return {
            ...location,
            reviewCount: activeReviews.length,
            avgTaste: Math.round(avgTaste * 10) / 10,
            avgPresentation: Math.round(avgPresentation * 10) / 10
          };
        });
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Get profiles for search
   */
  async searchProfiles(searchQuery: string, limit: number = 20): Promise<any[]> {
    return this.query(
      `profiles_search_${searchQuery}`,
      async () => {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .ilike('username', `%${searchQuery}%`)
          .eq('deleted', false)
          .limit(limit);
        
        if (error) throw error;
        return data;
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Get comments for a review
   */
  async getComments(reviewId: string): Promise<any[]> {
    return this.query(
      `comments_${reviewId}`,
      async () => {
        const { data, error } = await supabase
          .from('comments')
          .select(`
            *,
            profile:profiles(id, username, avatar_url)
          `)
          .eq('review_id', reviewId)
          .order('inserted_at', { ascending: true });
        
        if (error) throw error;
        return data;
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Create a review
   */
  async createReview(reviewData: any): Promise<any> {
    const { data, error } = await supabase
      .from('reviews')
      .insert(reviewData)
      .select('id')
      .single();
    
    if (error) throw error;
    
    // Invalidate related caches
    this.invalidateUserCaches(reviewData.user_id);
    
    return data;
  }
  
  /**
   * Create a comment
   */
  async createComment(commentData: any): Promise<any> {
    const { data, error } = await supabase
      .from('comments')
      .insert(commentData)
      .select(`
        *,
        profile:profiles(id, username, avatar_url)
      `)
      .single();
    
    if (error) throw error;
    
    // Invalidate comments cache
    this.queryCache.delete(`comments_${commentData.review_id}`);
    
    return data;
  }
  
  /**
   * Delete a comment
   */
  async deleteComment(commentId: number, reviewId: string): Promise<void> {
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    
    if (error) throw error;
    
    // Invalidate comments cache
    this.queryCache.delete(`comments_${reviewId}`);
  }
  
  /**
   * Create a notification
   */
  async createNotification(notificationData: any): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .insert(notificationData);
    
    if (error) throw error;
  }
  
  /**
   * Block a user
   */
  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from('blocks')
      .insert([{
        blocker_id: blockerId,
        blocked_id: blockedId
      }]);
    
    if (error) throw error;
    
    // Invalidate caches
    this.queryCache.delete(`blocked_${blockerId}`);
    this.invalidateUserCaches(blockerId);
  }
  
  /**
   * Create a report
   */
  async createReport(reportData: any): Promise<void> {
    const { error } = await supabase
      .from('reports')
      .insert([reportData]);
    
    if (error) throw error;
  }
  
  /**
   * Get location by ID
   */
  async getLocation(locationId: string): Promise<any> {
    return this.query(
      `location_${locationId}`,
      async () => {
        const { data, error } = await supabase
          .from('location_ratings')
          .select('*')
          .eq('id', locationId)
          .single();
        
        if (error) throw error;
        return data;
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION }
    );
  }
  
  /**
   * Create or get location
   */
  async createOrGetLocation(locationData: any, userId: string): Promise<string> {
    // First try to find existing location
    const { data: existing, error: findError } = await supabase
      .from('locations')
      .select('id')
      .eq('name', locationData.name)
      .eq('address', locationData.address)
      .maybeSingle();
    
    if (findError) throw findError;
    
    if (existing) {
      return existing.id;
    }
    
    // Create new location
    const { data, error } = await supabase
      .from('locations')
      .insert({
        ...locationData,
        created_by: userId
      })
      .select('id')
      .single();
    
    if (error) throw error;
    return data.id;
  }
  
  /**
   * Invalidate user-related caches
   */
  private invalidateUserCaches(userId: string): void {
    const keysToDelete = Array.from(this.queryCache.keys()).filter(key => 
      key.includes(`_${userId}`) || 
      key.includes(`reviews_`) ||
      key.includes(`followed_`) ||
      key.includes(`blocked_`)
    );
    
    keysToDelete.forEach(key => this.queryCache.delete(key));
  }
  
  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    this.queryCache.clear();
    this.pendingQueries.clear();
    
    try {
      await AsyncStorage.removeItem('db_query_cache');
    } catch (error) {
      console.error('Error clearing database cache:', error);
    }
  }
  
  /**
   * Get cache statistics
   */
  getCacheStats(): { cacheSize: number; pendingQueries: number } {
    return {
      cacheSize: this.queryCache.size,
      pendingQueries: this.pendingQueries.size
    };
  }
}

export default DatabaseService.getInstance();
