export interface CommentLikeCount {
  count: number;
  has_liked: boolean;
}

export const normalizeCommentLikeCounts = (
  value: unknown
): Map<number, CommentLikeCount> => {
  const rows =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const number = (input: unknown) => {
    const parsed = Number(input);
    return Number.isFinite(parsed) ? parsed : 0;
  };
  return new Map(
    Object.entries(rows).flatMap(([id, value]) => {
      const row =
        value && typeof value === "object" && !Array.isArray(value)
          ? (value as Record<string, unknown>)
          : {};
      const commentId = Number(id);
      return Number.isFinite(commentId)
        ? [
            [
              commentId,
              { count: number(row.count), has_liked: Boolean(row.has_liked) },
            ] as const,
          ]
        : [];
    })
  );
};
