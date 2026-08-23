import { count, dayCounts, nullableNumber, record } from "./model.mjs";

export const resolveGrowth = (value) => {
  const row = record(value);
  return {
    totalMembers: count(row.totalMembers),
    signupsInRange: count(row.signupsInRange),
    previousSignups: count(row.previousSignups),
    reviewsInRange: count(row.reviewsInRange),
    previousReviews: count(row.previousReviews),
    reviewedInRange: count(row.reviewedInRange),
    onboardingCompletedTotal: count(row.onboardingCompletedTotal),
    onboardingCompletedInRange: count(row.onboardingCompletedInRange),
    membersWithFirstReview: count(row.membersWithFirstReview),
    membersWithSecondReview: count(row.membersWithSecondReview),
    firstReviewsInRange: count(row.firstReviewsInRange),
    secondReviewsInRange: count(row.secondReviewsInRange),
    averageDaysToFirstReview: nullableNumber(row.averageDaysToFirstReview),
    signupsByDay: dayCounts(row.signupsByDay),
    reviewsByDay: dayCounts(row.reviewsByDay),
  };
};
