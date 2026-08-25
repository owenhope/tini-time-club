import type { ReviewStepKey } from "@/utils/reviewStepValidation";

export interface ReviewQuestion {
  title: string;
  key?: ReviewStepKey;
}

export const REVIEW_QUESTIONS: readonly ReviewQuestion[] = [
  { title: "Where was this served?", key: "location" },
  { title: "Which Spirit?", key: "spirit" },
  { title: "Which Type?", key: "type" },
  { title: "Presentation Rating", key: "presentation" },
  { title: "Taste Rating", key: "taste" },
  { title: "Add a Caption", key: "comment" },
  { title: "Preview" },
];

export const REVIEW_STEP_TOTAL = REVIEW_QUESTIONS.length + 2;

export const getReviewStepNumber = (questionIndex: number): number =>
  questionIndex + 3;

export const getReviewStepProgress = (questionIndex: number): number =>
  (getReviewStepNumber(questionIndex) / REVIEW_STEP_TOTAL) * 100;
