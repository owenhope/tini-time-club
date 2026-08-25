export interface SharePreviewReview {
  id: string;
  comment: string | null;
  inserted_at: string;
  taste: number | null;
  presentation: number | null;
  location: { name: string | null } | null;
  profile: { username: string | null } | null;
}

export interface SharePreviewReviewRow {
  id: string | number;
  comment: string | null;
  inserted_at: string;
  taste: number | null;
  presentation: number | null;
  location: { name: string | null } | { name: string | null }[] | null;
  profile:
    | { username: string | null; deleted?: boolean | null }
    | { username: string | null; deleted?: boolean | null }[]
    | null;
}

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? (value[0] ?? null) : (value ?? null);

export const normalizeSharePreviewReviews = (
  rows: SharePreviewReviewRow[]
): SharePreviewReview[] =>
  rows
    .map((review) => {
      const location = one(review.location);
      const profile = one(review.profile);
      if (profile?.deleted) return null;
      return {
        id: String(review.id),
        comment: review.comment,
        inserted_at: review.inserted_at,
        taste: review.taste,
        presentation: review.presentation,
        location,
        profile: profile ? { username: profile.username } : null,
      };
    })
    .filter(Boolean) as SharePreviewReview[];
