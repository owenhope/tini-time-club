import { RANK_TIERS, type RankTier } from "@/utils/ranking";
import { supabase } from "@/utils/supabase";

export type ReviewPublishingStage = "upload" | "database";

export class ReviewPublishingError extends Error {
  constructor(
    readonly stage: ReviewPublishingStage,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ReviewPublishingError";
  }
}

export interface ReviewPublishLocation {
  id?: string | number | null;
  name?: string | null;
  address?: string | null;
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ReviewPublishDraft {
  location: ReviewPublishLocation;
  spiritId: string | number | null;
  typeId: string | number | null;
  taste: number;
  presentation: number;
  comment: string;
}

export interface PublishedReview {
  reviewId: string;
  locationId: string;
  locationName: string;
  imagePath: string;
  reviewCount: number;
  rankUp: RankTier | null;
  becameRegular: boolean;
}

interface PublishReviewDependencies {
  uploadImage: () => Promise<string | null>;
  removeImage: (imagePath: string) => Promise<void>;
  onStage?: (stage: ReviewPublishingStage) => void;
  onCleanupError?: (error: unknown) => void;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const identifier = (value: unknown): string | null => {
  if (typeof value === "string" && value.length > 0) return value;
  return typeof value === "number" && Number.isFinite(value)
    ? String(value)
    : null;
};

const finiteNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const optionalText = (value: string | null | undefined) => {
  const text = value?.trim();
  return text ? text : null;
};

const decodePublishedReview = (
  value: unknown,
  imagePath: string
): PublishedReview => {
  if (!isRecord(value)) {
    throw new Error("Review publishing returned an invalid result.");
  }

  const reviewId = identifier(value.reviewId);
  const locationId = identifier(value.locationId);
  const reviewCount = finiteNumber(value.reviewCount);
  const locationName =
    typeof value.locationName === "string" ? value.locationName.trim() : "";
  if (!reviewId || !locationId || reviewCount == null || !locationName) {
    throw new Error("Review publishing returned an incomplete result.");
  }

  const rankUp =
    typeof value.rankUp === "string"
      ? (RANK_TIERS.find((tier) => tier.key === value.rankUp) ?? null)
      : null;

  return {
    reviewId,
    locationId,
    locationName,
    imagePath,
    reviewCount,
    rankUp,
    becameRegular: value.becameRegular === true,
  };
};

/**
 * Upload the image, then publish all relational review effects in one
 * database transaction. Storage cannot join a Postgres transaction, so a
 * failed database call compensates by deleting the newly uploaded object.
 */
export async function publishReview(
  draft: ReviewPublishDraft,
  {
    uploadImage,
    removeImage,
    onStage,
    onCleanupError,
  }: PublishReviewDependencies
): Promise<PublishedReview> {
  onStage?.("upload");
  const imagePath = await uploadImage();
  if (!imagePath) {
    throw new ReviewPublishingError("upload", "Review image upload failed.");
  }

  try {
    onStage?.("database");
    const { data, error } = await supabase.rpc("publish_review_v1", {
      p_comment: draft.comment.trim(),
      p_image_url: imagePath,
      p_latitude: finiteNumber(draft.location.latitude),
      p_location_address: optionalText(draft.location.address),
      p_location_id: finiteNumber(draft.location.id),
      p_location_name: optionalText(draft.location.name),
      p_longitude: finiteNumber(draft.location.longitude),
      p_place_id: optionalText(draft.location.placeId),
      p_presentation: draft.presentation,
      p_spirit_id: finiteNumber(draft.spiritId),
      p_taste: draft.taste,
      p_type_id: finiteNumber(draft.typeId),
    });
    if (error) throw error;
    return decodePublishedReview(data, imagePath);
  } catch (error) {
    try {
      await removeImage(imagePath);
    } catch (cleanupError) {
      onCleanupError?.(cleanupError);
    }
    throw new ReviewPublishingError(
      "database",
      "Review publishing transaction failed.",
      { cause: error }
    );
  }
}
