import { supabase } from "@/utils/supabase";
import { publicContentService } from "@/services/public-content-service";
import imageCache from "@/utils/imageCache";
import type {
  Comment,
  LocationRating,
  NamedOption,
  MentionSpan,
  Profile,
  Review,
} from "@/types/types";
import { mentionPayload, trimMentionBody } from "@/utils/mentions";
import { reportError, warn } from "@/utils/log";
import { withTimeout } from "@/utils/async";
import { getSupportedSpirits, getSupportedTypes } from "@/utils/reviewOptions";
import AnalyticService from "@/services/analyticsService";
import { hydrateReviewMentions } from "@/services/mentionService";
import { normalizeCommentLikeCounts } from "@/utils/commentLikeCounts";

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

export interface EditableReview {
  id: string;
  user_id: string;
  image_url: string;
  display_image_url: string;
  comment: string | null;
  taste: number;
  presentation: number;
  location: string | number | null;
  spirit: string | number;
  type: string | number;
  location_details: {
    id: string | number;
    name: string;
    address: string | null;
    place_id: string | null;
  } | null;
}

export interface ReviewUpdates {
  image_url?: string;
  location?: string | number | null;
  spirit?: string | number;
  type?: string | number;
  taste?: number;
  presentation?: number;
  comment?: string;
}

const QUERY_TIMEOUT_MS = 20_000;

class DatabaseService {
  private static instance: DatabaseService;
  private queryCache = new Map<string, CachedQuery>();
  private pendingQueries = new Map<string, Promise<any>>();
  private cacheGeneration = 0;

  // Default cache durations (in milliseconds) - Persistent for better UX
  private readonly DEFAULT_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
  private readonly STATIC_DATA_CACHE_DURATION = 4 * 60 * 60 * 1000; // 4 hours (types, spirits)
  private readonly USER_DATA_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes (profiles, reviews)

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
      forceRefresh = false,
    } = options;

    // Check cache first (unless force refresh)
    if (cache && !forceRefresh) {
      const cached = this.queryCache.get(queryKey);
      if (cached && Date.now() < cached.expiresAt) {
        return cached.data;
      }
    }

    // Check if query is already pending, unless the caller explicitly needs a
    // fresh read after a write changed the underlying relationship.
    if (!forceRefresh && this.pendingQueries.has(queryKey)) {
      return this.pendingQueries.get(queryKey)!;
    }

    // Execute query
    const generation = this.cacheGeneration;
    const queryPromise = withTimeout(queryFn(), QUERY_TIMEOUT_MS);
    this.pendingQueries.set(queryKey, queryPromise);

    try {
      const result = await queryPromise;

      // Cache the result
      if (
        cache &&
        generation === this.cacheGeneration &&
        this.pendingQueries.get(queryKey) === queryPromise
      ) {
        this.queryCache.set(queryKey, {
          data: result,
          timestamp: Date.now(),
          expiresAt: Date.now() + cacheDuration,
        });
      }

      return result;
    } finally {
      if (this.pendingQueries.get(queryKey) === queryPromise) {
        this.pendingQueries.delete(queryKey);
      }
    }
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string): Promise<Profile> {
    return this.query(
      `profile_${userId}`,
      async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .eq("deleted", false)
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
  async updateUserProfile(
    userId: string,
    updates: Partial<Profile>
  ): Promise<Profile> {
    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", userId)
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
  async getReviews(
    options: {
      userId?: string;
      locationId?: string;
      limit?: number;
      offset?: number;
      excludeBlocked?: boolean;
      currentUserId?: string;
      /** Restrict the page to reviews by members the authenticated viewer follows. */
      followedOnly?: boolean;
      /** Bypass the cached page (pull-to-refresh); the fresh result still gets cached. */
      forceRefresh?: boolean;
    } = {}
  ): Promise<Review[]> {
    const {
      userId,
      locationId,
      limit = 20,
      offset = 0,
      excludeBlocked = true,
      currentUserId,
      followedOnly = false,
      forceRefresh = false,
    } = options;

    // forceRefresh must not change the cache key, or refreshed data would be
    // stored under a different key than normal reads look up.
    const cacheKey = `reviews_${JSON.stringify({
      userId,
      locationId,
      limit,
      offset,
      excludeBlocked,
      currentUserId,
      followedOnly,
    })}`;

    const reviews = await this.query<any[]>(
      cacheKey,
      async () => {
        if (!currentUserId) {
          if (followedOnly) return [];
          return publicContentService.getFeed({
            userId,
            locationId,
            limit,
            offset,
          });
        }

        // One round trip: the feed_reviews function joins locations/spirits/
        // types/profiles and computes likes_count, comments_count and
        // has_liked server-side, and does the blocked/deleted filtering in
        // SQL so pages are never short.
        const { data, error } = await supabase.rpc("feed_reviews_followed", {
          p_viewer: currentUserId ?? null,
          p_limit: limit,
          p_offset: offset,
          p_user_id: userId ?? null,
          p_location_id: locationId ? Number(locationId) : null,
          p_exclude_blocked: excludeBlocked,
          p_followed_only: followedOnly,
        });

        if (error) throw error;
        return data ?? [];
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION, forceRefresh }
    );

    // Visitor rows already carry short-lived, transformed signed URLs from
    // the public-content gateway. Attempting to sign them again would treat a
    // URL as a storage path and fail under the intentionally locked anon role.
    if (!currentUserId) return reviews ?? [];

    // Hydrate image paths into signed URLs on the way out — after the cache,
    // because signed URLs expire on their own schedule. Every review surface
    // needs this, so it lives here instead of copy-pasted at each call site.
    if (!reviews?.length) return reviews ?? [];
    const reviewsWithLocationRatings =
      await this.hydrateReviewLocationRatings(reviews);
    const reviewsWithCommentLikes = await this.hydrateRecentCommentLikes(
      reviewsWithLocationRatings,
      currentUserId
    );
    const imageUrls = await imageCache.getReviewImageUrls(
      reviewsWithCommentLikes.map((review) => review.image_url)
    );
    return reviewsWithCommentLikes.map((review) => ({
      ...review,
      image_url: imageUrls[review.image_url] || review.image_url,
    }));
  }

  /**
   * Feed rows should already include the venue aggregate from feed_reviews.
   * Older cached rows and stale RPC definitions may not, so repair the shape
   * here before the review card decides whether to show the place score.
   */
  private async hydrateReviewLocationRatings<T extends Review>(
    reviews: T[]
  ): Promise<T[]> {
    const missingLocationIds = [
      ...new Set(
        reviews
          .filter((review) => {
            const location = review.location;
            return (
              location?.id != null &&
              (location.rating == null ||
                (location.total_ratings ?? 0) <= 0 ||
                location.is_golden_glass == null ||
                location.is_location_verified == null)
            );
          })
          .map((review) => Number(review.location.id))
          .filter((id) => Number.isFinite(id))
      ),
    ];

    if (missingLocationIds.length === 0) return reviews;

    try {
      const { data, error } = await supabase
        .from("location_ratings")
        .select("id,rating,total_ratings,is_golden_glass,is_location_verified")
        .in("id", missingLocationIds);

      if (error) throw error;
      const ratingsByLocationId = new Map(
        (data ?? []).map((rating) => [String(rating.id), rating])
      );

      reviews.forEach((review) => {
        const rating = ratingsByLocationId.get(String(review.location?.id));
        if (!rating) return;

        review.location = {
          ...review.location,
          rating: rating.rating ?? null,
          total_ratings: rating.total_ratings ?? 0,
          is_golden_glass: Boolean(rating.is_golden_glass),
          is_location_verified: Boolean(rating.is_location_verified),
        };
      });
    } catch (error) {
      warn("Unable to hydrate feed location ratings:", error);
    }

    return reviews;
  }

  private async hydrateRecentCommentLikes<T extends Review>(
    reviews: T[],
    currentUserId?: string
  ): Promise<T[]> {
    const commentIds = [
      ...new Set(
        reviews.flatMap((review) =>
          (review.recent_comments ?? []).map((comment) => comment.id)
        )
      ),
    ];
    if (commentIds.length === 0) return reviews;

    try {
      const { data, error } = await supabase.rpc("get_comment_like_counts_v1", {
        p_comment_ids: commentIds,
      });
      if (error) throw error;
      const counts = normalizeCommentLikeCounts(data);

      return reviews.map((review) => ({
        ...review,
        recent_comments: (review.recent_comments ?? []).map((comment) => ({
          ...comment,
          likes_count: counts.get(comment.id)?.count ?? 0,
          has_liked: counts.get(comment.id)?.has_liked ?? false,
        })),
      }));
    } catch (error) {
      warn("Unable to hydrate feed comment likes:", error);
      return reviews;
    }
  }

  /**
   * Get one public review by id. Used by shared web/deep links, so it does not
   * require an authenticated viewer; engagement fields are still populated.
   */
  async getReview(
    reviewId: string | number,
    currentUserId?: string
  ): Promise<Review> {
    if (!currentUserId) {
      return publicContentService.getReview(reviewId);
    }
    const review = await this.query<any>(
      `review_${reviewId}`,
      async () => {
        const { data, error } = await supabase
          .from("reviews")
          .select(
            `
            id,
            comment,
            image_url,
            inserted_at,
            taste,
            presentation,
            user_id,
            location:locations!reviews_location_fkey(id,name,address),
            spirit:spirits(name),
            type:types(name),
            profile:profiles!reviews_user_id_fkey1(id,username,avatar_url,is_verified,review_count,deleted)
          `
          )
          .eq("id", reviewId)
          .eq("state", 1)
          .single();

        if (error) throw error;
        if ((data as any)?.profile?.deleted) {
          throw new Error("Review author is unavailable.");
        }

        const location = Array.isArray(data.location)
          ? (data.location[0] ?? null)
          : data.location;
        const [likes, comments, recentComments, locationRating] =
          await Promise.all([
            supabase
              .from("likes")
              .select("review_id", { count: "exact", head: true })
              .eq("review_id", reviewId),
            supabase
              .from("comments")
              .select("id", { count: "exact", head: true })
              .eq("review_id", reviewId),
            supabase
              .from("comments")
              .select(
                `
              id,
              body,
              inserted_at,
              review_id,
              user_id,
              profile:profiles!comments_user_id_fkey(id,username,avatar_url,is_verified,review_count)
            `
              )
              .eq("review_id", reviewId)
              .order("inserted_at", { ascending: false })
              .limit(2),
            location?.id
              ? supabase
                  .from("location_ratings")
                  .select(
                    "rating,total_ratings,is_golden_glass,is_location_verified"
                  )
                  .eq("id", location.id)
                  .maybeSingle()
              : Promise.resolve({ data: null, error: null }),
          ]);

        if (likes.error) throw likes.error;
        if (comments.error) throw comments.error;
        if (recentComments.error) throw recentComments.error;
        if (locationRating.error) throw locationRating.error;

        return {
          ...data,
          id: String(data.id),
          location: location
            ? {
                ...location,
                rating: locationRating.data?.rating ?? null,
                total_ratings: locationRating.data?.total_ratings ?? 0,
                is_golden_glass: Boolean(locationRating.data?.is_golden_glass),
                is_location_verified: Boolean(
                  locationRating.data?.is_location_verified
                ),
              }
            : location,
          likes_count: likes.count ?? 0,
          comments_count: comments.count ?? 0,
          has_liked: false,
          recent_comments: recentComments.data ?? [],
        };
      },
      { cacheDuration: this.USER_DATA_CACHE_DURATION }
    );

    const imageUrls = await imageCache.getReviewImageUrls([review.image_url]);
    const withImage = {
      ...review,
      image_url: imageUrls[review.image_url] || review.image_url,
    };
    try {
      const [withMentions] = await hydrateReviewMentions([withImage]);
      return withMentions;
    } catch (error) {
      warn("Could not hydrate review mentions", error);
      return withImage;
    }
  }

  /** Load the raw values needed to reopen an owned review in the composer. */
  async getEditableReview(
    reviewId: string | number,
    userId: string
  ): Promise<EditableReview> {
    const { data, error } = await supabase
      .from("reviews")
      .select(
        `
        id,
        user_id,
        image_url,
        comment,
        taste,
        presentation,
        location,
        spirit,
        type,
        location_details:locations!reviews_location_fkey(id,name,address,place_id)
      `
      )
      .eq("id", reviewId)
      .eq("user_id", userId)
      .eq("state", 1)
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error("Review not found or cannot be edited.");

    const locationDetails = Array.isArray(data.location_details)
      ? (data.location_details[0] ?? null)
      : data.location_details;
    const displayImageUrl = data.image_url
      ? await imageCache.getReviewImageUrl(data.image_url)
      : null;

    return {
      ...data,
      id: String(data.id),
      display_image_url: displayImageUrl || data.image_url,
      location_details: locationDetails,
    } as EditableReview;
  }

  /**
   * Get spirits (static data - long cache)
   */
  async getSpirits(
    options: { forceRefresh?: boolean } = {}
  ): Promise<NamedOption[]> {
    const spirits = await this.query<NamedOption[]>(
      "spirits",
      async () => {
        const { data, error } = await supabase
          .from("spirits")
          .select("id, name");

        if (error) throw error;
        return data;
      },
      {
        cacheDuration: this.STATIC_DATA_CACHE_DURATION,
        forceRefresh: options.forceRefresh,
      }
    );

    return getSupportedSpirits(spirits);
  }

  /**
   * Get types (static data - long cache)
   */
  async getTypes(
    options: { forceRefresh?: boolean } = {}
  ): Promise<NamedOption[]> {
    const types = await this.query<NamedOption[]>(
      "types",
      async () => {
        const { data, error } = await supabase.from("types").select("id, name");

        if (error) throw error;
        return data;
      },
      {
        cacheDuration: this.STATIC_DATA_CACHE_DURATION,
        forceRefresh: options.forceRefresh,
      }
    );

    return getSupportedTypes(types);
  }

  /**
   * Get profiles for search
   */
  async searchProfiles(
    searchQuery: string,
    limit: number = 20
  ): Promise<any[]> {
    return this.query(
      `profiles_search_${searchQuery}`,
      async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url, is_verified")
          .ilike("username", `%${searchQuery}%`)
          .eq("deleted", false)
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
  async getComments(
    reviewId: string,
    currentUserId?: string
  ): Promise<Comment[]> {
    if (!currentUserId) {
      return publicContentService.getComments(reviewId);
    }
    const { data, error } = await supabase.rpc("get_review_comments", {
      p_review_id: Number(reviewId),
    });

    if (error) throw error;
    return (data ?? []) as Comment[];
  }

  /** Update the editable fields of an owned review. Passing `null` mentions
   * keeps the review's stored mentions untouched — the composer could not load
   * them, and replacing them with nothing would silently strip every mention
   * and withdraw the targets' notifications. */
  async updateReview(
    reviewId: string,
    updates: ReviewUpdates,
    userId?: string,
    mentions?: MentionSpan[] | null
  ): Promise<any> {
    if (mentions !== undefined) {
      const caption = trimMentionBody(updates.comment ?? "", mentions ?? []);
      const { data, error } = await supabase.rpc("update_review_v2", {
        p_comment: caption.text,
        p_image_url: updates.image_url,
        p_location_id:
          updates.location == null ? null : Number(updates.location),
        p_mentions:
          mentions === null
            ? null
            : mentionPayload(caption.text, caption.mentions),
        p_presentation: updates.presentation,
        p_review_id: Number(reviewId),
        p_spirit_id: updates.spirit == null ? null : Number(updates.spirit),
        p_taste: updates.taste,
        p_type_id: updates.type == null ? null : Number(updates.type),
      });
      if (error) throw error;
      if (mentions !== null && caption.mentions.length) {
        void AnalyticService.capture("mention_submitted", {
          surface: "review_edit",
          count: new Set(caption.mentions.map((mention) => mention.profileId))
            .size,
        });
      }
      this.queryCache.delete(`review_${reviewId}`);
      if (userId) this.invalidateUserCaches(userId);
      return data;
    }

    let query = supabase.from("reviews").update(updates).eq("id", reviewId);

    if (userId) query = query.eq("user_id", userId);

    const { data, error } = await query.select().single();

    if (error) throw error;

    // Invalidate related caches
    this.queryCache.delete(`review_${reviewId}`);
    if (data?.user_id) {
      this.invalidateUserCaches(data.user_id);
    }

    return data;
  }

  /**
   * Create a comment
   */
  async createComment(
    commentData: any,
    mentions?: MentionSpan[]
  ): Promise<any> {
    if (mentions) {
      const comment = trimMentionBody(String(commentData.body ?? ""), mentions);
      const { data, error } = await supabase.rpc("create_comment_v2", {
        p_body: comment.text,
        p_mentions: mentionPayload(comment.text, comment.mentions),
        p_review_id: Number(commentData.review_id),
      });
      if (error) throw error;
      if (comment.mentions.length) {
        void AnalyticService.capture("mention_submitted", {
          surface: "comment",
          count: new Set(comment.mentions.map((mention) => mention.profileId))
            .size,
        });
      }
      this.queryCache.delete(`comments_${commentData.review_id}`);
      return data;
    }

    const { data, error } = await supabase
      .from("comments")
      .insert(commentData)
      .select(
        `
        *,
        profile:profiles!comments_user_id_fkey(id, username, avatar_url, is_verified, review_count)
      `
      )
      .single();

    if (error) throw error;

    // Invalidate comments cache
    this.queryCache.delete(`comments_${commentData.review_id}`);

    return { ...data, likes_count: 0, has_liked: false };
  }

  /**
   * Delete a comment
   */
  async deleteComment(commentId: number, reviewId: string): Promise<void> {
    const { error } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId);

    if (error) throw error;

    // Invalidate comments cache
    this.queryCache.delete(`comments_${reviewId}`);
  }

  async setCommentLiked(
    commentId: number,
    userId: string,
    liked: boolean,
    reviewId: string
  ): Promise<void> {
    const { error } = liked
      ? await supabase
          .from("comment_likes")
          .upsert({ comment_id: commentId, user_id: userId })
      : await supabase
          .from("comment_likes")
          .delete()
          .eq("comment_id", commentId)
          .eq("user_id", userId);

    if (error) throw error;
    this.queryCache.delete(`comments_${reviewId}`);
  }

  async reportComment(
    commentId: number,
    reason: string
  ): Promise<"created" | "duplicate"> {
    const { data, error } = await supabase.rpc("report_comment", {
      p_comment_id: commentId,
      p_reason: reason,
    });

    if (error) throw error;
    if (data === "created" || data === "duplicate") return data;
    throw new Error(`Unable to report comment: ${data ?? "unknown"}`);
  }

  /**
   * Block a user.
   *
   * Go through here rather than writing to `blocks` directly: the blocked-id
   * list is cached, and a write that skips the invalidation leaves the feed
   * still showing the person you just blocked.
   */
  async blockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase.from("blocks").insert([
      {
        blocker_id: blockerId,
        blocked_id: blockedId,
      },
    ]);

    if (error) throw error;

    // Invalidate caches
    this.queryCache.delete(`blocked_${blockerId}`);
    this.invalidateUserCaches(blockerId);
  }

  /** Undo a block, invalidating the same caches. */
  async unblockUser(blockerId: string, blockedId: string): Promise<void> {
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", blockerId)
      .eq("blocked_id", blockedId);

    if (error) throw error;

    this.queryCache.delete(`blocked_${blockerId}`);
    this.invalidateUserCaches(blockerId);
  }

  async reportReview(reviewId: string, reason: string): Promise<void> {
    const { data, error } = await supabase.rpc("report_review", {
      p_review_id: Number(reviewId),
      p_reason: reason,
    });

    if (error) throw error;
    if (data !== "created") {
      throw new Error(`Unable to report review: ${data ?? "unknown"}`);
    }
  }

  /**
   * Get location by ID
   */
  async getLocation(
    locationId: string,
    currentUserId?: string
  ): Promise<LocationRating> {
    if (!currentUserId) {
      return publicContentService.getLocation(locationId);
    }
    return this.query(
      `location_${locationId}`,
      async () => {
        const { data, error } = await supabase
          .from("location_ratings")
          .select("*")
          .eq("id", locationId)
          .single();

        if (error) throw error;
        return {
          ...data,
          is_golden_glass: Boolean(data.is_golden_glass),
          is_location_verified: Boolean(data.is_location_verified),
        };
      },
      // Verification can be changed by an admin while the member app is
      // open. Do not serve a stale identity flag from the long-lived cache.
      { cache: false }
    );
  }

  /** Public profile projection used only while no member session exists. */
  async getPublicProfileByUsername(username: string) {
    return publicContentService.getProfile(username);
  }

  /**
   * Create or get location
   * Now prioritizes place_id for matching since all locations have place_id
   */
  async createOrGetLocation(
    locationData: any,
    userId: string
  ): Promise<string> {
    if (!locationData) {
      throw new Error("Location data is required");
    }
    // Keep the public service signature so existing review/favorite callers do
    // not change. The RPC derives auth.uid() itself; userId is intentionally
    // not sent to the database and therefore cannot be spoofed by a caller.
    void userId;
    const point =
      typeof locationData.location === "string"
        ? locationData.location.match(
            /^POINT\s*\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)$/i
          )
        : null;
    const latitude = Number(
      locationData.latitude ?? locationData.coordinates?.latitude ?? point?.[2]
    );
    const longitude = Number(
      locationData.longitude ??
        locationData.coordinates?.longitude ??
        point?.[1]
    );
    const { data, error } = await supabase.rpc("resolve_or_create_location", {
      p_name: locationData.name,
      p_address: locationData.address ?? null,
      p_place_id: locationData.place_id ?? null,
      p_latitude: Number.isFinite(latitude) ? latitude : null,
      p_longitude: Number.isFinite(longitude) ? longitude : null,
    });
    if (error) throw error;
    const resolved = Array.isArray(data) ? data[0] : data;
    if (!resolved?.id)
      throw new Error("Location resolver returned no location");
    return String(resolved.id);
  }

  /**
   * Invalidate user-related caches
   */
  private invalidateUserCaches(userId: string): void {
    const keysToDelete = Array.from(this.queryCache.keys()).filter(
      (key) =>
        key.includes(`_${userId}`) ||
        key.includes(`reviews_`) ||
        key.includes(`blocked_`)
    );

    keysToDelete.forEach((key) => this.queryCache.delete(key));
  }

  /**
   * Clear review caches to force fresh data
   */
  async clearReviewCaches(): Promise<void> {
    try {
      // Remove from memory cache
      const memoryKeysToDelete: string[] = [];
      for (const key of this.queryCache.keys()) {
        if (key.startsWith("reviews_")) {
          memoryKeysToDelete.push(key);
        }
      }

      memoryKeysToDelete.forEach((key) => {
        this.queryCache.delete(key);
      });
    } catch (error) {
      reportError("Error clearing review caches:", error);
    }
  }

  clearFollowCaches(userId?: string): void {
    const viewerKey = userId ? `"currentUserId":"${userId}"` : null;
    const isFollowedFeedKey = (key: string) =>
      key.startsWith("reviews_") &&
      key.includes('"followedOnly":true') &&
      (!viewerKey || key.includes(viewerKey));

    for (const key of this.queryCache.keys()) {
      if (isFollowedFeedKey(key)) {
        this.queryCache.delete(key);
      }
    }

    for (const key of this.pendingQueries.keys()) {
      if (isFollowedFeedKey(key)) {
        this.pendingQueries.delete(key);
      }
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    this.cacheGeneration += 1;
    this.queryCache.clear();
    this.pendingQueries.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { cacheSize: number; pendingQueries: number } {
    return {
      cacheSize: this.queryCache.size,
      pendingQueries: this.pendingQueries.size,
    };
  }
}

export default DatabaseService.getInstance();
