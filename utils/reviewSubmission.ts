export type ReviewSubmissionStage = "upload" | "location" | "review";

export class ReviewSubmissionError extends Error {
  constructor(
    readonly stage: ReviewSubmissionStage,
    message: string,
    options?: ErrorOptions
  ) {
    super(message, options);
    this.name = "ReviewSubmissionError";
  }
}

interface ReviewSubmissionDependencies {
  uploadImage: () => Promise<string | null>;
  resolveLocationId: () => Promise<string | number | null>;
  createReview: (
    imagePath: string,
    locationId: string
  ) => Promise<string | number | null>;
  removeImage: (imagePath: string) => Promise<void>;
  afterLocationResolved?: (locationId: string) => Promise<void>;
  onStage?: (stage: ReviewSubmissionStage) => void;
  onLocationResolutionError?: (error: unknown) => void;
  onCleanupError?: (error: unknown) => void;
}

export interface ReviewSubmissionResult {
  reviewId: string;
  imagePath: string;
  locationId: string;
}

/**
 * Coordinates the non-transactional Storage and Postgres writes used when a
 * member publishes a review.
 */
export async function submitNewReview({
  uploadImage,
  resolveLocationId,
  createReview,
  removeImage,
  afterLocationResolved,
  onStage,
  onLocationResolutionError,
  onCleanupError,
}: ReviewSubmissionDependencies): Promise<ReviewSubmissionResult> {
  onStage?.("location");
  let resolvedLocationId: string | number | null;
  try {
    resolvedLocationId = await resolveLocationId();
  } catch (error) {
    onLocationResolutionError?.(error);
    throw new ReviewSubmissionError(
      "location",
      "Review location resolution failed.",
      { cause: error }
    );
  }
  if (resolvedLocationId == null) {
    throw new ReviewSubmissionError(
      "location",
      "Review location resolution returned no ID."
    );
  }
  const locationId = String(resolvedLocationId);

  await afterLocationResolved?.(locationId);

  onStage?.("upload");
  const imagePath = await uploadImage();
  if (!imagePath) {
    throw new ReviewSubmissionError("upload", "Review image upload failed.");
  }

  try {
    onStage?.("review");
    const createdReviewId = await createReview(imagePath, locationId);
    if (createdReviewId == null) {
      throw new ReviewSubmissionError(
        "review",
        "Review creation returned no ID."
      );
    }

    return { reviewId: String(createdReviewId), imagePath, locationId };
  } catch (error) {
    try {
      await removeImage(imagePath);
    } catch (cleanupError) {
      onCleanupError?.(cleanupError);
    }
    throw error;
  }
}
