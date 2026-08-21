import { isSelectableRating } from "./ratingUtils";

export type ReviewStepKey =
  "location" | "spirit" | "type" | "taste" | "presentation" | "comment";

interface ReviewStepValues {
  location?: unknown;
  spirit?: string | number | null;
  type?: string | number | null;
  taste?: number;
  presentation?: number;
  comment?: string | null;
}

type RatingTouches = Partial<Record<"taste" | "presentation", boolean>>;

export const isReviewStepComplete = (
  key: ReviewStepKey | undefined,
  values: ReviewStepValues,
  ratingTouches: RatingTouches
): boolean => {
  switch (key) {
    case "location":
      return Boolean(values.location);
    case "spirit":
    case "type":
      return values[key] !== "" && values[key] != null;
    case "taste":
    case "presentation":
      return (
        Boolean(ratingTouches[key]) && isSelectableRating(values[key] ?? 0)
      );
    case "comment":
      return Boolean(values.comment?.trim());
    default:
      return true;
  }
};
