import { useCallback } from "react";
import { useShareMenuSheet } from "@/components/share/shareMenuContext";
import {
  copyLocationLink,
  shareLocationViaInstagram,
  shareLocationViaMessage,
  shareLocationViaWhatsApp,
  type ShareableLocation,
} from "@/utils/locationShare";
import {
  getShareDestinationActions,
  type ShareDestinationAction,
} from "@/utils/shareDestinations";
import { useMembership } from "@/context/membership-context";

/** Presents the venue share menu from location header actions. */
export const useLocationShareMenu = (location: ShareableLocation | null) => {
  const showShareMenu = useShareMenuSheet();
  const { requireMembership } = useMembership();

  return useCallback(() => {
    if (!location) return;
    if (!requireMembership("share-location")) return;

    const actions = getShareDestinationActions();

    const runAction = (action: ShareDestinationAction) => {
      switch (action.destination) {
        case "instagram_story":
        case "instagram_post":
          void shareLocationViaInstagram(location, action.destination);
          return;
        case "whatsapp":
          void shareLocationViaWhatsApp(location);
          return;
        case "message":
          void shareLocationViaMessage(location);
          return;
        case "copy_link":
          void copyLocationLink(location);
          return;
      }
    };

    showShareMenu({
      title: "Share location",
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
  }, [location, requireMembership, showShareMenu]);
};
