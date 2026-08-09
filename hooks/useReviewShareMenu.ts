import { useCallback } from "react";
import { ActionSheetIOS, Alert, type AlertButton } from "react-native";
import { useRouter } from "expo-router";
import type { Review } from "@/types/types";
import { useTheme } from "@/theme";
import { routes } from "@/utils/routes";
import { shareReviewViaSheet } from "@/utils/reviewShare";
import {
  getReviewShareMenuActions,
  type ReviewShareMenuAction,
} from "@/utils/reviewShareMenu";

/** Presents the review's complete share menu from every existing share icon. */
export const useReviewShareMenu = (review: Review | null) => {
  const router = useRouter();
  const { isDark } = useTheme();

  return useCallback(() => {
    if (!review) return;

    const hasPhoto = Boolean(review.image_url?.trim());
    const actions = getReviewShareMenuActions(hasPhoto);

    const runAction = (action: ReviewShareMenuAction) => {
      if ("format" in action) {
        router.push(routes.reviewSharePreview(review.id, action.format));
        return;
      }

      void shareReviewViaSheet(review, "share_link");
    };

    if (process.env.EXPO_OS === "ios") {
      const options = [...actions.map((action) => action.label), "Cancel"];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: "Share review",
          options,
          cancelButtonIndex: options.length - 1,
          userInterfaceStyle: isDark ? "dark" : "light",
        },
        (selectedIndex) => {
          const action = actions[selectedIndex];
          if (action) runAction(action);
        }
      );
      return;
    }

    const buttons: AlertButton[] = actions.map((action) => ({
      text: action.label,
      onPress: () => runAction(action),
    }));
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Share review", undefined, buttons);
  }, [isDark, review, router]);
};
