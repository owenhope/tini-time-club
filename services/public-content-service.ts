import { supabase } from "@/utils/supabase";
import type { LocationRating, Profile, Review, Comment } from "@/types/types";

type PublicContentRequest =
  | {
      operation: "feed";
      limit?: number;
      offset?: number;
      userId?: string;
      locationId?: string;
    }
  | { operation: "review"; reviewId: string | number }
  | { operation: "comments"; reviewId: string | number }
  | { operation: "profile"; username: string }
  | { operation: "profiles"; search?: string; limit?: number }
  | { operation: "locations"; search?: string; limit?: number }
  | { operation: "location"; locationId: string | number }
  | {
      operation: "locations-in-view";
      minLat: number;
      minLong: number;
      maxLat: number;
      maxLong: number;
    };

interface PublicProfileResponse {
  profile: Profile;
  followersCount: number;
  followingCount: number;
}

class PublicContentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicContentError";
  }
}

const invoke = async <T>(request: PublicContentRequest): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("public-content", {
    body: request,
  });

  if (error) throw new PublicContentError(error.message);
  if (!data || data.error) {
    throw new PublicContentError(
      data?.error ?? "Public content is unavailable"
    );
  }
  return data.data as T;
};

export const publicContentService = {
  getFeed: (
    request: Omit<
      Extract<PublicContentRequest, { operation: "feed" }>,
      "operation"
    > = {}
  ) => invoke<Review[]>({ operation: "feed", ...request }),

  getReview: (reviewId: string | number) =>
    invoke<Review>({ operation: "review", reviewId }),

  getComments: (reviewId: string | number) =>
    invoke<Comment[]>({ operation: "comments", reviewId }),

  getProfile: (username: string) =>
    invoke<PublicProfileResponse>({ operation: "profile", username }),

  getProfiles: (search?: string, limit = 50) =>
    invoke<Profile[]>({ operation: "profiles", search, limit }),

  getLocations: (search?: string, limit = 50) =>
    invoke<LocationRating[]>({ operation: "locations", search, limit }),

  getLocation: (locationId: string | number) =>
    invoke<LocationRating>({ operation: "location", locationId }),

  getLocationsInView: (bounds: {
    minLat: number;
    minLong: number;
    maxLat: number;
    maxLong: number;
  }) => invoke<LocationRating[]>({ operation: "locations-in-view", ...bounds }),
};
