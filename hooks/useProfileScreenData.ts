import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/utils/supabase";
import databaseService from "@/services/databaseService";
import {
  getProfileRegularPlaces,
  type ProfileRegularPlace,
} from "@/services/regularsService";
import type { FavoriteLocationValue } from "@/services/favoriteLocationSelection";
import type { NamedOption, Review } from "@/types/types";
import { reportError } from "@/utils/log";

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

  const { limit, offset, excludeBlocked } = reviewOptions ?? {};

  const loadUserReviews = useCallback(
    async (isRefresh = false) => {
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
        const reviewsData = await databaseService.getReviews({
          userId: profileId,
          // Without the viewer id the server computes has_liked for nobody and
          // the viewer's liked reviews render with unlit hearts.
          currentUserId: viewerId,
          ...(limit !== undefined && { limit }),
          ...(offset !== undefined && { offset }),
          ...(excludeBlocked !== undefined && { excludeBlocked }),
          forceRefresh: isRefresh,
        });

        // getReviews returns image_url already hydrated to a signed URL.
        setUserReviews(reviewsData);
      } catch (err) {
        reportError("Unexpected error while fetching reviews:", err);
      } finally {
        if (isRefresh) {
          setRefreshingReviews(false);
        } else {
          setLoadingReviews(false);
        }
      }
    },
    [profileId, viewerId, limit, offset, excludeBlocked]
  );

  const loadRegularPlaces = useCallback(async () => {
    if (!profileId) return;
    setLoadingRegulars(true);
    try {
      setRegularPlaces(await getProfileRegularPlaces(profileId));
    } catch (error) {
      reportError("Error loading regular places:", error);
      setRegularPlaces([]);
    } finally {
      setLoadingRegulars(false);
    }
  }, [profileId]);

  const loadFollowCounts = useCallback(async () => {
    if (!profileId) return;
    // The two counts are independent — fetch them together.
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
  }, [profileId]);

  useEffect(() => {
    const loadFavoriteLocation = async () => {
      if (!favoriteLocationId) {
        setFavoriteLocation(null);
        return;
      }

      const { data, error } = await supabase
        .from("locations")
        .select("id, name, address")
        .eq("id", favoriteLocationId)
        .maybeSingle();

      if (error) {
        reportError("Error loading favorite location:", error);
        setFavoriteLocation(null);
        return;
      }
      setFavoriteLocation(data);
    };

    loadFavoriteLocation();
  }, [favoriteLocationId]);

  useEffect(() => {
    const loadSpiritsAndTypes = async () => {
      try {
        // Both are cached in databaseService, so this is cheap after first run.
        const [spiritsData, typesData] = await Promise.all([
          databaseService.getSpirits(),
          databaseService.getTypes(),
        ]);
        setSpirits(spiritsData);
        setTypes(typesData);
      } catch (error) {
        reportError("Error loading spirits and types:", error);
      }
    };

    loadSpiritsAndTypes();
  }, []);

  return {
    userReviews,
    setUserReviews,
    loadingReviews,
    refreshingReviews,
    loadUserReviews,
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

export default useProfileScreenData;
