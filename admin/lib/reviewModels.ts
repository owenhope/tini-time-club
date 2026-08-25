import { emptyReviewEngagement, type ReviewEngagement } from "./reviewTypes";

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
  const tally = (rows: ReviewEngagementRow[], key: keyof ReviewEngagement) => {
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

export const buildReviewEngagementFromCounts = (
  reviewIds: string[],
  value: unknown
): Map<string, ReviewEngagement> => {
  const rows =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const number = (input: unknown) => {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return new Map(
    reviewIds.map((id) => {
      const row = rows[id];
      const counts =
        row && typeof row === "object" && !Array.isArray(row)
          ? (row as Record<string, unknown>)
          : {};
      return [
        id,
        {
          likes: number(counts.likes),
          comments: number(counts.comments),
          shares: number(counts.shares),
        },
      ] as const;
    })
  );
};
