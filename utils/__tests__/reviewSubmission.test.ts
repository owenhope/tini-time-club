import { completePostReview } from "../reviewSubmission";

describe("completePostReview", () => {
  it("shows an earned achievement before any profile refresh or navigation", () => {
    const showCelebration = jest.fn();
    const navigateToFeed = jest.fn();
    const refreshProfile = jest.fn(async () => undefined);

    completePostReview({
      hasAchievements: true,
      showCelebration,
      navigateToFeed,
      refreshProfile,
    });

    expect(showCelebration).toHaveBeenCalledTimes(1);
    expect(navigateToFeed).not.toHaveBeenCalled();
    expect(refreshProfile).not.toHaveBeenCalled();
  });

  it("navigates before refreshing when there is no achievement", () => {
    const order: string[] = [];

    completePostReview({
      hasAchievements: false,
      showCelebration: jest.fn(),
      navigateToFeed: () => order.push("navigate"),
      refreshProfile: async () => {
        order.push("refresh");
      },
    });

    expect(order).toEqual(["navigate", "refresh"]);
  });
});
