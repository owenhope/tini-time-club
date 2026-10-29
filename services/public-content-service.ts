import { supabase } from "@/utils/supabase";
import type { LocationRating, Profile, Review, Comment } from "@/types/types";
import type { ReviewCursor, ReviewPage } from "@/services/reviewFeedService";
import type { CommentCursor, CommentPage } from "@/services/commentPageService";

type PublicContentRequest =
  | {
      operation: "feed-page-v1";
      cursor?: ReviewCursor | null;
      limit?: number;
      userId?: string;
      locationId?: string | number;
    }
  | { operation: "review"; reviewId: string | number }
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
    };

interface PublicProfileResponse {
  profile: Profile;
  followersCount: number;
  followingCount: number;
}

const normalizeLocation = <T extends LocationRating>(location: T): T => ({
  ...location,
  is_golden_glass: Boolean(location.is_golden_glass),
  is_location_verified: Boolean(location.is_location_verified),
});

class PublicContentError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PublicContentError";
  }
}

/** The HTTP status of a FunctionsHttpError, whose context is the Response. */
const httpStatus = (error: unknown): number | undefined => {
  const status = (error as { context?: { status?: unknown } }).context?.status;
  return typeof status === "number" ? status : undefined;
};

const invoke = async <T>(request: PublicContentRequest): Promise<T> => {
  const { data, error } = await supabase.functions.invoke("public-content", {
    body: request,
  });

  if (error) {
    // functions-js only says "non-2xx"; name the status and operation so a
    // report tells a 429 from a 500 without the function logs.
    const status = httpStatus(error);
    throw new PublicContentError(
      status
        ? `${error.message} (HTTP ${status}, ${request.operation})`
        : error.message,
      { cause: error }
    );
  }
  if (!data || data.error) {
    throw new PublicContentError(
      data?.error ?? "Public content is unavailable"
    );
  }
  return data.data as T;
};

export const publicContentService = {
  getFeedPage: (
    request: Omit<
      Extract<PublicContentRequest, { operation: "feed-page-v1" }>,
      "operation"
    > = {}
  ) => invoke<ReviewPage>({ operation: "feed-page-v1", ...request }),

  getReview: (reviewId: string | number) =>
    invoke<Review>({ operation: "review", reviewId }),

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

  getLocations: async (search?: string, limit = 25, offset = 0) =>
    (
      await invoke<LocationRating[]>({
        operation: "locations",
        search,
        limit,
        offset,
      })
    ).map(normalizeLocation),

  getLocation: async (locationId: string | number) =>
    normalizeLocation(
      await invoke<LocationRating>({ operation: "location", locationId })
    ),

  getLocationsInView: (bounds: {
    minLat: number;
    minLong: number;
    maxLat: number;
    maxLong: number;
  }) =>
    invoke<LocationRating[]>({
      operation: "locations-in-view",
      ...bounds,
    }).then((locations) => locations.map(normalizeLocation)),
};
