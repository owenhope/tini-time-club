import {
  emptyReviewEngagement,
  type ReviewEngagement,
} from "./reviewTypes";

export interface ReviewEngagementRow {
  review_id: string | number | null;
}

export const buildReviewEngagement = (
  reviewIds: string[],
  likes: ReviewEngagementRow[],
  comments: ReviewEngagementRow[],
  shares: ReviewEngagementRow[]
): Map<string, ReviewEngagement> => {
  const engagement = new Map(
    reviewIds.map((id) => [id, emptyReviewEngagement()] as const)
  );
  const tally = (
    rows: ReviewEngagementRow[],
    key: keyof ReviewEngagement
  ) => {
    for (const row of rows) {
      if (row.review_id == null) continue;
      const engagementRow = engagement.get(String(row.review_id));
      if (engagementRow) engagementRow[key] += 1;
    }
  };

  tally(likes, "likes");
  tally(comments, "comments");
  tally(shares, "shares");
  return engagement;
};
