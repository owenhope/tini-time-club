import {
  createInitialReviewComposerFlow,
  reviewComposerFlowReducer,
} from "../reviewComposerFlow";

describe("reviewComposerFlowReducer", () => {
  it("moves through the capture and review screens without conflicting flags", () => {
    const initial = createInitialReviewComposerFlow();
    const preview = reviewComposerFlowReducer(initial, {
      type: "showPhotoPreview",
    });
    const questions = reviewComposerFlowReducer(preview, {
      type: "continueFromPhotoPreview",
    });

    expect(initial).toMatchObject({ screen: "camera" });
    expect(preview).toMatchObject({ screen: "photoPreview" });
    expect(questions).toMatchObject({
      screen: "questions",
      questionIndex: 0,
    });
  });

  it("keeps the current review when changing the photo is cancelled", () => {
    const questions = reviewComposerFlowReducer(
      createInitialReviewComposerFlow(),
      { type: "startReview" }
    );
    const camera = reviewComposerFlowReducer(questions, {
      type: "startChangingPhoto",
    });
    const restored = reviewComposerFlowReducer(camera, {
      type: "cancelChangingPhoto",
    });

    expect(camera).toMatchObject({
      screen: "changePhoto",
    });
    expect(restored).toMatchObject({
      screen: "questions",
      questionIndex: 0,
    });
  });

  it("guards animated question transitions", () => {
    const questions = reviewComposerFlowReducer(
      createInitialReviewComposerFlow(),
      { type: "startReview" }
    );
    const transitioning = reviewComposerFlowReducer(questions, {
      type: "beginStepTransition",
    });

    expect(
      reviewComposerFlowReducer(transitioning, {
        type: "beginStepTransition",
      })
    ).toBe(transitioning);
    expect(
      reviewComposerFlowReducer(transitioning, {
        type: "completeStepTransition",
        questionIndex: 2,
      })
    ).toMatchObject({
      screen: "questions",
      questionIndex: 2,
      isTransitioning: false,
    });
  });
});
