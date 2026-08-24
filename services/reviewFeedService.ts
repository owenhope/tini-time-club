import type { Review } from "@/types/types";
import { publicContentService } from "@/services/public-content-service";
import imageCache from "@/utils/imageCache";
import { supabase } from "@/utils/supabase";
import { hydrateReviewMentions } from "@/services/mentionService";
import { warn } from "@/utils/log";

export interface ReviewCursor {
  insertedAt: string;
  id: string;
}

export interface ReviewPage {
  reviews: Review[];
  nextCursor: ReviewCursor | null;
  hasMore: boolean;
}

export interface GetReviewPageOptions {
  viewerId?: string;
  cursor?: ReviewCursor | null;
  limit?: number;
  userId?: string;
  locationId?: string | number;
  excludeBlocked?: boolean;
  followedOnly?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const identifier = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) return value;
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : null;
};

const decodeCursor = (value: unknown): ReviewCursor | null => {
  if (!isRecord(value)) return null;
  const id = identifier(value.id);
  const insertedAt =
    typeof value.insertedAt === "string" && value.insertedAt.length > 0
      ? value.insertedAt
      : null;
  return id && insertedAt ? { insertedAt, id } : null;
};

const decodeReview = (value: unknown): Review | null => {
  if (!isRecord(value)) return null;
  const id = identifier(value.id);
  if (!id || typeof value.inserted_at !== "string") return null;

  const location = isRecord(value.location)
    ? { ...value.location, id: identifier(value.location.id) ?? "" }
    : value.location;
  return {
    ...(value as unknown as Review),
    id,
    location: location as Review["location"],
  };
};

const decodePage = (value: unknown): ReviewPage => {
  if (!isRecord(value)) throw new Error("Feed returned an invalid page.");
  const rawReviews = Array.isArray(value.reviews) ? value.reviews : [];
  return {
    reviews: rawReviews
      .map(decodeReview)
      .filter((review): review is Review => review !== null),
    nextCursor: decodeCursor(value.nextCursor),
    hasMore: value.hasMore === true,
  };
};

/** Load one stable feed page. All relational data is supplied by one RPC. */
export async function getReviewPage({
  viewerId,
  cursor = null,
  limit = 20,
  userId,
  locationId,
  excludeBlocked = true,
  followedOnly = false,
}: GetReviewPageOptions): Promise<ReviewPage> {
  if (!viewerId) {
    const page = await publicContentService.getFeedPage({
      cursor,
      limit,
      userId,
      locationId,
    });
    return decodePage(page);
  }

  const { data, error } = await supabase.rpc("get_feed_page_v1", {
    p_cursor_id: cursor ? Number(cursor.id) : null,
    p_cursor_inserted_at: cursor?.insertedAt ?? null,
    p_exclude_blocked: excludeBlocked,
    p_followed_only: followedOnly,
    p_limit: limit,
    p_location_id: locationId == null ? null : Number(locationId),
    p_user_id: userId ?? null,
    p_viewer: viewerId,
  });
  if (error) throw error;

  const page = decodePage(data);
  if (!page.reviews.length) return page;

  const imageUrls = await imageCache.getReviewImageUrls(
    page.reviews.map((review) => review.image_url)
  );
  const reviews = page.reviews.map((review) => ({
    ...review,
    image_url: imageUrls[review.image_url] || review.image_url,
  }));
  let hydratedReviews = reviews;
  try {
    hydratedReviews = await hydrateReviewMentions(reviews);
  } catch (error) {
    // Mention metadata is an enhancement; stale/offline search must never
    // empty an otherwise valid feed page.
    warn("Could not hydrate review mentions", error);
  }
  return {
    ...page,
    reviews: hydratedReviews,
  };
}
