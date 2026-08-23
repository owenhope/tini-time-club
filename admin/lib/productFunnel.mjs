const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Derive the onboarding and review funnel from authoritative account/profile
 * and review rows. This is the dashboard's stable computation seam; transport
 * and rendering stay outside it.
 *
 * @param {{
 *   profiles: {id: string, eula_accepted_at?: string | null}[],
 *   authUsers: Map<string, {created_at?: string}>,
 *   reviews: {user_id: string, inserted_at: string}[],
 *   since: Date,
 *   until: Date
 * }} input
 */
export const buildProductFunnel = ({
  profiles,
  authUsers,
  reviews,
  since,
  until,
}) => {
  const milestonesByMember = new Map();
  for (const review of reviews) {
    const timestamps = milestonesByMember.get(review.user_id) ?? [];
    timestamps.push(new Date(review.inserted_at).getTime());
    milestonesByMember.set(review.user_id, timestamps);
  }
  for (const timestamps of milestonesByMember.values()) {
    timestamps.sort((a, b) => a - b);
  }

  const firstReviewTimes = [...milestonesByMember.values()]
    .map((timestamps) => timestamps[0])
    .filter((timestamp) => timestamp != null);
  const secondReviewTimes = [...milestonesByMember.values()]
    .map((timestamps) => timestamps[1])
    .filter((timestamp) => timestamp != null);
  const inRange = (timestamp) =>
    timestamp >= since.getTime() && timestamp <= until.getTime();
  const daysToFirstReview = [...milestonesByMember.entries()]
    .map(([userId, timestamps]) => {
      const signupAt = authUsers.get(userId)?.created_at;
      if (!signupAt || timestamps[0] == null) return null;
      const elapsed = timestamps[0] - new Date(signupAt).getTime();
      return elapsed >= 0 ? elapsed / DAY_MS : null;
    })
    .filter((days) => days != null);

  return {
    onboardingCompletedTotal: profiles.filter(
      (profile) => profile.eula_accepted_at
    ).length,
    onboardingCompletedInRange: profiles.filter((profile) => {
      if (!profile.eula_accepted_at) return false;
      return inRange(new Date(profile.eula_accepted_at).getTime());
    }).length,
    membersWithFirstReview: firstReviewTimes.length,
    membersWithSecondReview: secondReviewTimes.length,
    firstReviewsInRange: firstReviewTimes.filter(inRange).length,
    secondReviewsInRange: secondReviewTimes.filter(inRange).length,
    averageDaysToFirstReview:
      daysToFirstReview.length > 0
        ? daysToFirstReview.reduce((sum, days) => sum + days, 0) /
          daysToFirstReview.length
        : null,
  };
};
