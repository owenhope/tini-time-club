import type { ReviewShareFormat } from "@/utils/routes";
import type { ShareDestination } from "@/utils/shareDestinations";

export type ReviewShareMenuAction =
  | {
      label: string;
      destination: Extract<
        ShareDestination,
        "instagram_story" | "instagram_post"
      >;
      format: ReviewShareFormat;
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
  { label: "Instagram Story", destination: "instagram_story", format: "story" },
  { label: "Instagram Post", destination: "instagram_post", format: "post" },
  { label: "WhatsApp", destination: "whatsapp" },
  { label: "Message", destination: "message" },
  { label: "Copy Link", destination: "copy_link" },
];
