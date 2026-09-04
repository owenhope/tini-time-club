import {
  getReviewStepNumber,
  getReviewStepProgress,
  REVIEW_QUESTIONS,
  REVIEW_STEP_TOTAL,
} from "../reviewComposerSteps";

describe("review composer steps", () => {
  it("keeps the camera and photo preview ahead of the question flow", () => {
    expect(REVIEW_STEP_TOTAL).toBe(9);
    expect(REVIEW_QUESTIONS.map(({ key }) => key)).toEqual([
      "location",
      "spirit",
      "type",
      "presentation",
      "taste",
      "comment",
      undefined,
    ]);
  });

  it("maps question indexes to the displayed progress steps", () => {
    expect(getReviewStepNumber(0)).toBe(3);
    expect(getReviewStepNumber(REVIEW_QUESTIONS.length - 1)).toBe(9);
    expect(getReviewStepProgress(0)).toBeCloseTo(33.3333, 3);
    expect(getReviewStepProgress(REVIEW_QUESTIONS.length - 1)).toBe(100);
  });
});
