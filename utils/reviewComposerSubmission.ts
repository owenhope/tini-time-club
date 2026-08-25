import type { MentionSpan } from "@/types/types";
import type { ReviewUpdates } from "@/services/databaseService";
import type {
  PublishedReview,
  ReviewPublishDraft,
  ReviewPublishingStage,
} from "@/services/reviewPublishingService";

export interface ReviewComposerLocation {
  name: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  place_id?: string;
  id?: string;
}

export interface ReviewComposerCreateDependencies {
  publishReview: (
    draft: ReviewPublishDraft,
    dependencies: {
      uploadImage: () => Promise<string | null>;
      removeImage: (imagePath: string) => Promise<void>;
      onStage?: (stage: ReviewPublishingStage) => void;
      onCleanupError?: (error: unknown) => void;
    }
  ) => Promise<PublishedReview>;
  uploadImage: () => Promise<string | null>;
  removeImage: (imagePath: string) => Promise<void>;
  onStage?: (stage: ReviewPublishingStage) => void;
  onCleanupError?: (error: unknown) => void;
}

export interface ReviewComposerCreateInput {
  location: ReviewComposerLocation;
  spiritId: string | number;
  typeId: string | number;
  taste: number;
  presentation: number;
  comment: string;
  mentions: MentionSpan[];
}

export const submitNewReview = (
  input: ReviewComposerCreateInput,
  dependencies: ReviewComposerCreateDependencies
): Promise<PublishedReview> =>
  dependencies.publishReview(
    {
      location: {
        id:
          input.location.id && !input.location.coordinates
            ? input.location.id
            : null,
        name: input.location.name,
        address: input.location.address,
        placeId: input.location.place_id,
        latitude: input.location.coordinates?.latitude,
        longitude: input.location.coordinates?.longitude,
      },
      spiritId: input.spiritId,
      typeId: input.typeId,
      taste: input.taste,
      presentation: input.presentation,
      comment: input.comment,
      mentions: input.mentions,
    },
    {
      uploadImage: dependencies.uploadImage,
      removeImage: dependencies.removeImage,
      onStage: dependencies.onStage,
      onCleanupError: dependencies.onCleanupError,
    }
  );

export interface ReviewComposerEditDependencies {
  uploadImage: () => Promise<string | null>;
  removeImage: (imagePath: string) => Promise<void>;
  resolveLocationId: () => Promise<string | number | null>;
  updateReview: (
    reviewId: string,
    updates: ReviewUpdates,
    userId: string,
    mentions: MentionSpan[] | null
  ) => Promise<unknown>;
}

export interface ReviewComposerEditInput {
  reviewId: string;
  userId: string;
  originalImagePath: string;
  photoChanged: boolean;
  spirit: string | number;
  type: string | number;
  taste: number;
  presentation: number;
  comment: string;
  mentions: MentionSpan[] | null;
}

export interface ReviewComposerEditResult {
  locationId: string | number | null;
}

/**
 * Updates the review and compensates for a replacement image if the database
 * write fails. The caller owns UI state and analytics; this module owns the
 * ordered write/cleanup sequence.
 */
export async function submitEditedReview(
  input: ReviewComposerEditInput,
  dependencies: ReviewComposerEditDependencies
): Promise<ReviewComposerEditResult> {
  let uploadedImagePath: string | null = null;

  try {
    if (input.photoChanged) {
      uploadedImagePath = await dependencies.uploadImage();
      if (!uploadedImagePath) {
        throw new Error("Replacement image upload failed.");
      }
    }

    const locationId = await dependencies.resolveLocationId();
    await dependencies.updateReview(
      input.reviewId,
      {
        image_url: uploadedImagePath || input.originalImagePath,
        location: locationId,
        spirit: input.spirit,
        type: input.type,
        taste: input.taste,
        presentation: input.presentation,
        comment: input.comment,
      },
      input.userId,
      input.mentions
    );

    if (uploadedImagePath) {
      await dependencies.removeImage(input.originalImagePath);
    }

    return { locationId };
  } catch (error) {
    if (uploadedImagePath) {
      await dependencies.removeImage(uploadedImagePath);
    }
    throw error;
  }
}
