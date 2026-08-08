import {
  publishReviewUpdated,
  subscribeToReviewUpdates,
} from "../reviewEvents";

describe("review update events", () => {
  it("notifies active listeners and stops after unsubscribe", () => {
    const listener = jest.fn();
    const unsubscribe = subscribeToReviewUpdates(listener);

    publishReviewUpdated("42");
    unsubscribe();
    publishReviewUpdated("43");

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith("42");
  });
});
