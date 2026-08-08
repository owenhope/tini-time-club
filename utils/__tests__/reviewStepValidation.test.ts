import { isReviewStepComplete } from "../reviewStepValidation";

const emptyValues = {
  location: null,
  spirit: "",
  type: "",
  taste: 1,
  presentation: 1,
};

describe("isReviewStepComplete", () => {
  it("requires location, spirit, and type selections", () => {
    expect(isReviewStepComplete("location", emptyValues, {})).toBe(false);
    expect(isReviewStepComplete("spirit", emptyValues, {})).toBe(false);
    expect(isReviewStepComplete("type", emptyValues, {})).toBe(false);

    expect(
      isReviewStepComplete("location", { ...emptyValues, location: {} }, {})
    ).toBe(true);
    expect(
      isReviewStepComplete("spirit", { ...emptyValues, spirit: 1 }, {})
    ).toBe(true);
    expect(isReviewStepComplete("type", { ...emptyValues, type: 2 }, {})).toBe(
      true
    );
  });

  it("requires explicit interaction with defaulted ratings", () => {
    expect(isReviewStepComplete("taste", emptyValues, {})).toBe(false);
    expect(isReviewStepComplete("presentation", emptyValues, {})).toBe(false);
    expect(isReviewStepComplete("taste", emptyValues, { taste: true })).toBe(
      true
    );
    expect(
      isReviewStepComplete("presentation", emptyValues, {
        presentation: true,
      })
    ).toBe(true);
  });
});
