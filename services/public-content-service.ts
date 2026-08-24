import { supabase } from "@/utils/supabase";
import type { LocationRating, Profile, Review, Comment } from "@/types/types";
import type { ReviewCursor, ReviewPage } from "@/services/reviewFeedService";
import type { CommentCursor, CommentPage } from "@/services/commentPageService";

type PublicContentRequest =
  | {
      operation: "feed";
      limit?: number;
      offset?: number;
      userId?: string;
      locationId?: string | number;
    }
  | {
      operation: "feed-page-v1";
      cursor?: ReviewCursor | null;
      limit?: number;
      userId?: string;
      locationId?: string | number;
    }
  | { operation: "review"; reviewId: string | number }
  | { operation: "comments"; reviewId: string | number }
  | {
      operation: "comment-page-v1";
      reviewId: string | number;
      cursor?: CommentCursor | null;
      limit?: number;
    }
  | { operation: "profile"; username: string }
  | { operation: "profiles"; search?: string; limit?: number; offset?: number }
  | {
      operation: "locations";
      search?: string;
      limit?: number;
      offset?: number;
    }
  | { operation: "location"; locationId: string | number }
  | {
      operation: "locations-in-view";
      minLat: number;
      minLong: number;
      maxLat: number;
      maxLong: number;
      regionId?: number | null;
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

  getFeedPage: (
    request: Omit<
      Extract<PublicContentRequest, { operation: "feed-page-v1" }>,
      "operation"
    > = {}
  ) => invoke<ReviewPage>({ operation: "feed-page-v1", ...request }),

  getReview: (reviewId: string | number) =>
    invoke<Review>({ operation: "review", reviewId }),

  getComments: (reviewId: string | number) =>
    invoke<Comment[]>({ operation: "comments", reviewId }),

  getCommentPage: (
    request: Omit<
      Extract<PublicContentRequest, { operation: "comment-page-v1" }>,
      "operation"
    >
  ) => invoke<CommentPage>({ operation: "comment-page-v1", ...request }),

  getProfile: (username: string) =>
    invoke<PublicProfileResponse>({ operation: "profile", username }),

  getProfiles: (search?: string, limit = 25, offset = 0) =>
    invoke<Profile[]>({ operation: "profiles", search, limit, offset }),

  getLocations: (search?: string, limit = 25, offset = 0) =>
    invoke<LocationRating[]>({ operation: "locations", search, limit, offset }),

  getLocation: (locationId: string | number) =>
    invoke<LocationRating>({ operation: "location", locationId }),

  getLocationsInView: (bounds: {
    minLat: number;
    minLong: number;
    maxLat: number;
    maxLong: number;
    regionId?: number | null;
  }) => invoke<LocationRating[]>({ operation: "locations-in-view", ...bounds }),
};
