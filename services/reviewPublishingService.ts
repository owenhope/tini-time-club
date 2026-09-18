import { getRankTier, type RankTier } from "@/utils/ranking";
import { supabase } from "@/utils/supabase";
import type { MentionSpan } from "@/types/types";
import { mentionPayload, trimMentionBody } from "@/utils/mentions";
import AnalyticService from "@/services/analyticsService";
import type { PassportStampRecord } from "@/services/passportService";
import { reconcileMyPassport } from "@/services/passportService";

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
  mentions?: MentionSpan[];
}

export interface PublishedReview {
  reviewId: string;
  locationId: string;
  locationName: string;
  imagePath: string;
  reviewCount: number;
  passportPoints: number | null;
  rankUp: RankTier | null;
  becameRegular: boolean;
  passportStamps: PassportStampRecord[];
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

  return {
    reviewId,
    locationId,
    locationName,
    imagePath,
    reviewCount,
    passportPoints: null,
    rankUp: null,
    becameRegular: value.becameRegular === true,
    passportStamps: [],
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

  let published: PublishedReview;
  try {
    onStage?.("database");
    const caption = trimMentionBody(draft.comment, draft.mentions ?? []);
    const { data, error } = await supabase.rpc("publish_review_v2", {
      p_comment: caption.text,
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
      p_mentions: mentionPayload(caption.text, caption.mentions),
    });
    if (error) throw error;
    if (caption.mentions.length) {
      void AnalyticService.capture("mention_submitted", {
        surface: "review",
        count: new Set(caption.mentions.map((mention) => mention.profileId))
          .size,
      });
    }
    published = decodePublishedReview(data, imagePath);
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

  // Passport reconciliation is intentionally outside the publishing failure
  // boundary: the review is already committed and its image must not be
  // removed if this optional follow-up is unavailable.
  try {
    const transition = await reconcileMyPassport();
    const previousTier = getRankTier(transition.previousPoints);
    const currentTier = getRankTier(transition.points);
    published.passportPoints = transition.points;
    published.rankUp =
      currentTier && previousTier && currentTier.key !== previousTier.key
        ? currentTier
        : null;
    published.passportStamps = transition.unlocked;
  } catch {
    // The Passport screen reconciles again when it opens.
  }
  return published;
}
