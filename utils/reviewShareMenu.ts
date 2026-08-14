import type { ShareDestination } from "@/utils/shareDestinations";

export type ReviewShareMenuAction =
  | {
      label: string;
      destination: Extract<ShareDestination, "instagram_story">;
    }
  | {
      label: string;
      destination: Extract<
        ShareDestination,
        "whatsapp" | "message" | "copy_link"
      >;
    };

/** Keeps review share destinations consistent everywhere a review can share. */
export const getReviewShareMenuActions = (): ReviewShareMenuAction[] => [
  { label: "Instagram Story", destination: "instagram_story" },
  { label: "WhatsApp", destination: "whatsapp" },
  { label: "Message", destination: "message" },
  { label: "Copy Link", destination: "copy_link" },
];
