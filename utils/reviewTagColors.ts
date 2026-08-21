export interface ReviewTagColors {
  backgroundColor: string;
  textColor: string;
}

const REVIEW_TAG_COLORS: Record<string, ReviewTagColors> = {
  vesper: { backgroundColor: "#426B8A", textColor: "#FAF9F6" },
  classic: { backgroundColor: "#2F5D50", textColor: "#FAF9F6" },
  twist: { backgroundColor: "#F2FF71", textColor: "#336654" },
  vodka: { backgroundColor: "#EA6360", textColor: "#FFFFFF" },
  gin: { backgroundColor: "#E8763D", textColor: "#FAF9F6" },
  dirty: { backgroundColor: "#667A3E", textColor: "#FAF9F6" },
  dry: { backgroundColor: "#D7E7E2", textColor: "#24473D" },
  wet: { backgroundColor: "#5E8C7F", textColor: "#FAF9F6" },
  gibson: { backgroundColor: "#DCE0C8", textColor: "#3A4423" },
  filthy: { backgroundColor: "#394623", textColor: "#FAF9F6" },
  "50/50": { backgroundColor: "#B8A4D8", textColor: "#2F2548" },
  espresso: { backgroundColor: "#6F4518", textColor: "#FAF9F6" },
};

export const getReviewTagColors = (
  name: string | null | undefined
): ReviewTagColors | null => {
  const key = name?.trim().toLowerCase();
  return key ? (REVIEW_TAG_COLORS[key] ?? null) : null;
};
