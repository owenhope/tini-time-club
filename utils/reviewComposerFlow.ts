export type ReviewComposerScreen =
  "camera" | "changePhoto" | "photoPreview" | "questions";

export interface ReviewComposerFlowState {
  screen: ReviewComposerScreen;
  questionIndex: number;
  isTransitioning: boolean;
}

export type ReviewComposerFlowAction =
  | { type: "startReview" }
  | { type: "showPhotoPreview" }
  | { type: "continueFromPhotoPreview" }
  | { type: "startChangingPhoto" }
  | { type: "cancelChangingPhoto" }
  | { type: "returnToCamera" }
  | { type: "reset" }
  | { type: "beginStepTransition" }
  | { type: "completeStepTransition"; questionIndex: number }
  | { type: "cancelStepTransition" };

export const INITIAL_REVIEW_COMPOSER_FLOW: ReviewComposerFlowState = {
  screen: "camera",
  questionIndex: 0,
  isTransitioning: false,
};

export const createInitialReviewComposerFlow = (): ReviewComposerFlowState => ({
  ...INITIAL_REVIEW_COMPOSER_FLOW,
});

export const reviewComposerFlowReducer = (
  state: ReviewComposerFlowState,
  action: ReviewComposerFlowAction
): ReviewComposerFlowState => {
  switch (action.type) {
    case "startReview":
    case "continueFromPhotoPreview":
    case "cancelChangingPhoto":
      return {
        ...state,
        screen: "questions",
        questionIndex: 0,
        isTransitioning: false,
      };
    case "showPhotoPreview":
      return {
        ...state,
        screen: "photoPreview",
        isTransitioning: false,
      };
    case "startChangingPhoto":
      return {
        ...state,
        screen: "changePhoto",
        isTransitioning: false,
      };
    case "returnToCamera":
    case "reset":
      return createInitialReviewComposerFlow();
    case "beginStepTransition":
      if (state.isTransitioning) return state;
      return { ...state, isTransitioning: true };
    case "completeStepTransition":
      return {
        ...state,
        screen: "questions",
        questionIndex: action.questionIndex,
        isTransitioning: false,
      };
    case "cancelStepTransition":
      return { ...state, isTransitioning: false };
  }
};
