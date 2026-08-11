import { useCallback } from "react";
import { useRouter } from "expo-router";
import { useShareMenuSheet } from "@/components/share/shareMenuContext";
import type { Review } from "@/types/types";
import { routes } from "@/utils/routes";
import {
  copyReviewLink,
  shareReviewViaMessage,
  shareReviewViaWhatsApp,
} from "@/utils/reviewShare";
import {
  getReviewShareMenuActions,
  type ReviewShareMenuAction,
} from "@/utils/reviewShareMenu";

/** Presents the review's complete share menu from every existing share icon. */
export const useReviewShareMenu = (review: Review | null) => {
  const router = useRouter();
  const showShareMenu = useShareMenuSheet();

  return useCallback(() => {
    if (!review) return;

    const actions = getReviewShareMenuActions();

    const runAction = (action: ReviewShareMenuAction) => {
      switch (action.destination) {
        case "instagram_story":
        case "instagram_post":
          router.push(routes.reviewSharePreview(review.id, action.format));
          return;
        case "whatsapp":
          void shareReviewViaWhatsApp(review);
          return;
        case "message":
          void shareReviewViaMessage(review);
          return;
        case "copy_link":
          void copyReviewLink(review);
          return;
      }
    };

    showShareMenu({
      title: "Share review",
      actions: actions.map((action) => ({
        label: action.label,
        destination: action.destination,
        icon:
          action.destination === "instagram_story" ||
          action.destination === "instagram_post"
            ? "logo-instagram"
            : action.destination === "whatsapp"
              ? "logo-whatsapp"
              : action.destination === "message"
                ? "chatbubble-ellipses-outline"
                : "link-outline",
        onPress: () => runAction(action),
      })),
    });
  }, [review, router, showShareMenu]);
};
