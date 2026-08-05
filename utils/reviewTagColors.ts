export interface ReviewTagColors {
  backgroundColor: string;
  textColor: string;
}

const REVIEW_TAG_COLORS: Record<string, ReviewTagColors> = {
  vesper: { backgroundColor: "#426B8A", textColor: "#FAF9F6" },
  twist: { backgroundColor: "#F2FF71", textColor: "#1C3A2E" },
  vodka: { backgroundColor: "#EA6360", textColor: "#FFFFFF" },
  gin: { backgroundColor: "#E8763D", textColor: "#FAF9F6" },
  dirty: { backgroundColor: "#667A3E", textColor: "#FAF9F6" },
  espresso: { backgroundColor: "#6F4518", textColor: "#FAF9F6" },
};

export const getReviewTagColors = (
  name: string | null | undefined
): ReviewTagColors | null => {
  const key = name?.trim().toLowerCase();
  return key ? (REVIEW_TAG_COLORS[key] ?? null) : null;
};
