import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/utils/supabase";
import databaseService from "@/services/databaseService";
import {
  getProfileRegularPlaces,
  type ProfileRegularPlace,
} from "@/services/regularsService";
import type { FavoriteLocationValue } from "@/services/favoriteLocationSelection";
import type { NamedOption, Review } from "@/types/types";
import { reportError } from "@/utils/log";
import { getReviewPage, type ReviewCursor } from "@/services/reviewFeedService";

interface UseProfileScreenDataOptions {
  /** Whose data to load. */
  profileId: string | undefined;
  /** The signed-in user (currentUserId for getReviews). */
  viewerId: string | undefined;
  favoriteLocationId?: number | null;
  reviewOptions?: {
    limit?: number;
    offset?: number;
    excludeBlocked?: boolean;
  };
}

/**
 * Data shared by the own-profile screen and the visited-profile screen:
 * reviews, regular places, favorite location, spirits/types lookups and
 * follow counts.
 *
 * The favorite location and spirits/types load themselves (both screens want
 * them on mount / param change). Reviews, regulars and follow counts do NOT
 * auto-fetch — the two screens trigger them differently (own profile uses a
 * focus effect with a staleness gate; visited profile loads when the fetched
 * profile lands), so the load functions are exposed instead.
 */
export function useProfileScreenData({
  profileId,
  viewerId,
  favoriteLocationId,
  reviewOptions,
}: UseProfileScreenDataOptions) {
  const [userReviews, setUserReviews] = useState<Review[]>([]);
  // True initially so the grid shows its loading state instead of flashing
  // the empty state before the first load kicks off.
  const [loadingReviews, setLoadingReviews] = useState<boolean>(true);
  const [refreshingReviews, setRefreshingReviews] = useState<boolean>(false);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const reviewCursorRef = useRef<ReviewCursor | null>(null);
  const loadingMoreReviewsRef = useRef(false);
  const reviewsRequestRef = useRef(0);
  const [regularPlaces, setRegularPlaces] = useState<ProfileRegularPlace[]>([]);
  // True initially so the regulars tab shows its loading state instead of
  // flashing the empty message before the first load resolves.
  const [loadingRegulars, setLoadingRegulars] = useState(true);
  const [favoriteLocation, setFavoriteLocation] =
    useState<FavoriteLocationValue | null>(null);
  const [spirits, setSpirits] = useState<NamedOption[]>([]);
  const [types, setTypes] = useState<NamedOption[]>([]);
  const [followersCount, setFollowersCount] = useState<number>(0);
  const [followingCount, setFollowingCount] = useState<number>(0);
  const regularsRequestRef = useRef(0);
  const followCountsRequestRef = useRef(0);

  const { limit, excludeBlocked } = reviewOptions ?? {};
  const profileDataKey = `${profileId ?? ""}:${viewerId ?? ""}:${limit ?? ""}:${excludeBlocked ?? ""}`;
  const profileDataKeyRef = useRef(profileDataKey);
  profileDataKeyRef.current = profileDataKey;

  const loadUserReviews = useCallback(
    async (isRefresh = false) => {
      const requestId = ++reviewsRequestRef.current;
      const requestKey = profileDataKey;
      if (isRefresh) {
        setRefreshingReviews(true);
      } else {
        setLoadingReviews(true);
      }
      if (!profileId) {
        if (isRefresh) {
          setRefreshingReviews(false);
        } else {
          setLoadingReviews(false);
        }
        return;
      }
      try {
        const page = await getReviewPage({
          userId: profileId,
          viewerId,
          limit: limit ?? 24,
          excludeBlocked: excludeBlocked ?? true,
        });
        if (
          requestId !== reviewsRequestRef.current ||
          requestKey !== profileDataKeyRef.current
        )
          return;
        reviewCursorRef.current = page.nextCursor;
        setHasMoreReviews(page.hasMore);
        setUserReviews(page.reviews);
      } catch (err) {
        reportError("Unexpected error while fetching reviews:", err);
      } finally {
        if (
          requestId === reviewsRequestRef.current &&
          requestKey === profileDataKeyRef.current
        ) {
          if (isRefresh) {
            setRefreshingReviews(false);
          } else {
            setLoadingReviews(false);
          }
        }
      }
    },
    [profileDataKey, profileId, viewerId, limit, excludeBlocked]
  );

  const loadMoreUserReviews = useCallback(async () => {
    if (
      !profileId ||
      !hasMoreReviews ||
      !reviewCursorRef.current ||
      loadingMoreReviewsRef.current
    ) {
      return;
    }

    const requestId = ++reviewsRequestRef.current;
    const requestKey = profileDataKey;
    const cursor = reviewCursorRef.current;
    loadingMoreReviewsRef.current = true;
    try {
      const page = await getReviewPage({
        userId: profileId,
        viewerId,
        cursor,
        limit: limit ?? 24,
        excludeBlocked: excludeBlocked ?? true,
      });
      if (
        requestId !== reviewsRequestRef.current ||
        requestKey !== profileDataKeyRef.current
      )
        return;
      reviewCursorRef.current = page.nextCursor;
      setHasMoreReviews(page.hasMore);
      setUserReviews((current) => {
        const loaded = new Set(current.map((review) => String(review.id)));
        return [
          ...current,
          ...page.reviews.filter((review) => !loaded.has(String(review.id))),
        ];
      });
    } catch (error) {
      reportError("Unexpected error while loading more reviews:", error);
    } finally {
      if (
        requestId === reviewsRequestRef.current &&
        requestKey === profileDataKeyRef.current
      ) {
        loadingMoreReviewsRef.current = false;
      }
    }
  }, [
    excludeBlocked,
    hasMoreReviews,
    limit,
    profileDataKey,
    profileId,
    viewerId,
  ]);

  useEffect(() => {
    reviewsRequestRef.current += 1;
    regularsRequestRef.current += 1;
    followCountsRequestRef.current += 1;
    loadingMoreReviewsRef.current = false;
    setUserReviews([]);
    reviewCursorRef.current = null;
    setHasMoreReviews(false);
    setRegularPlaces([]);
    setLoadingReviews(Boolean(profileId));
    setLoadingRegulars(Boolean(profileId));
    setFavoriteLocation(null);
    setFollowersCount(0);
    setFollowingCount(0);
  }, [profileDataKey, profileId]);

  const loadRegularPlaces = useCallback(async () => {
    const requestId = ++regularsRequestRef.current;
    const requestKey = profileDataKey;
    if (!profileId) {
      setLoadingRegulars(false);
      return;
    }
    setLoadingRegulars(true);
    try {
      const places = await getProfileRegularPlaces(profileId);
      if (
        requestId !== regularsRequestRef.current ||
        requestKey !== profileDataKeyRef.current
      )
        return;
      setRegularPlaces(places);
    } catch (error) {
      reportError("Error loading regular places:", error);
      if (
        requestId === regularsRequestRef.current &&
        requestKey === profileDataKeyRef.current
      ) {
        setRegularPlaces([]);
      }
    } finally {
      if (
        requestId === regularsRequestRef.current &&
        requestKey === profileDataKeyRef.current
      ) {
        setLoadingRegulars(false);
      }
    }
  }, [profileDataKey, profileId]);

  const loadFollowCounts = useCallback(async () => {
    const requestId = ++followCountsRequestRef.current;
    const requestKey = profileDataKey;
    if (!profileId) return;
    // The two counts are independent — fetch them together.
    try {
      const [
        { count: followers, error: errorFollowers },
        { count: following, error: errorFollowing },
      ] = await Promise.all([
        supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("following_id", profileId),
        supabase
          .from("followers")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileId),
      ]);

      if (
        requestId !== followCountsRequestRef.current ||
        requestKey !== profileDataKeyRef.current
      )
        return;

      if (errorFollowers) {
        reportError("Error fetching followers count:", errorFollowers);
      } else {
        setFollowersCount(followers || 0);
      }
      if (errorFollowing) {
        reportError("Error fetching following count:", errorFollowing);
      } else {
        setFollowingCount(following || 0);
      }
    } catch (error) {
      if (
        requestId === followCountsRequestRef.current &&
        requestKey === profileDataKeyRef.current
      ) {
        reportError("Error fetching follow counts:", error);
      }
    }
  }, [profileDataKey, profileId]);

  useEffect(() => {
    let active = true;
    const loadFavoriteLocation = async () => {
      if (!favoriteLocationId) {
        if (active) setFavoriteLocation(null);
        return;
      }

      const { data, error } = await supabase
        .from("location_ratings")
        .select("id, name, address, is_golden_glass, is_location_verified")
        .eq("id", favoriteLocationId)
        .maybeSingle();

      if (error) {
        reportError("Error loading favorite location:", error);
        if (active) setFavoriteLocation(null);
        return;
      }
      if (active) setFavoriteLocation(data);
    };

    void loadFavoriteLocation();
    return () => {
      active = false;
    };
  }, [favoriteLocationId]);

  useEffect(() => {
    let active = true;
    const loadSpiritsAndTypes = async () => {
      try {
        // Both are cached in databaseService, so this is cheap after first run.
        const [spiritsData, typesData] = await Promise.all([
          databaseService.getSpirits(),
          databaseService.getTypes(),
        ]);
        if (!active) return;
        setSpirits(spiritsData);
        setTypes(typesData);
      } catch (error) {
        reportError("Error loading spirits and types:", error);
      }
    };

    void loadSpiritsAndTypes();
    return () => {
      active = false;
    };
  }, []);

  return {
    userReviews,
    setUserReviews,
    loadingReviews,
    refreshingReviews,
    hasMoreReviews,
    loadUserReviews,
    loadMoreUserReviews,
    regularPlaces,
    loadingRegulars,
    loadRegularPlaces,
    favoriteLocation,
    spirits,
    types,
    followersCount,
    followingCount,
    setFollowersCount,
    setFollowingCount,
    loadFollowCounts,
  };
}
