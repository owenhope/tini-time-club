interface PostReviewCompletion {
  hasAchievements: boolean;
  showCelebration: () => void;
  navigateToFeed: () => void;
  refreshProfile: () => Promise<void>;
}

/**
 * Finish the post-write UI without letting a profile refresh tear down the
 * review route before its earned celebration can render.
 */
export const completePostReview = ({
  hasAchievements,
  showCelebration,
  navigateToFeed,
  refreshProfile,
}: PostReviewCompletion): void => {
  if (hasAchievements) {
    showCelebration();
    return;
  }

  navigateToFeed();
  void refreshProfile();
};
