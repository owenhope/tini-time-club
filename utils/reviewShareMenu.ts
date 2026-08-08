import type { ReviewShareFormat } from "@/utils/routes";

export type ReviewShareMenuAction =
  { label: string; format: ReviewShareFormat } | { label: string; link: true };

/** Keeps ownership and photo eligibility out of the presentation layer. */
export const getReviewShareMenuActions = (
  hasPhoto: boolean
): ReviewShareMenuAction[] => [
  ...(hasPhoto
    ? ([
        { label: "Instagram Story", format: "story" },
        { label: "Instagram Post", format: "post" },
      ] satisfies ReviewShareMenuAction[])
    : []),
  { label: "Share Link", link: true },
];
