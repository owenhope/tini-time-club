import React, { memo } from "react";
import { ActionSheetIOS, Platform } from "react-native";
import { useTheme } from "@/theme";

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onEdit?: () => void;
  isOwnReview: boolean;
}

const ActionSheet = memo(
  ({
    visible,
    onClose,
    onDelete,
    onReport,
    onEdit,
    isOwnReview,
  }: ActionSheetProps) => {
    // The sheet is drawn by UIKit, so the only themable surface here is which
    // interface style it renders in — otherwise it ignores the in-app override
    // and follows the OS setting.
    const { isDark } = useTheme();

    React.useEffect(() => {
      if (visible) {
        if (Platform.OS === "ios") {
          const options = isOwnReview
            ? ["Edit Caption", "Delete Review", "Cancel"]
            : ["Report Review", "Cancel"];

          const destructiveButtonIndex = isOwnReview ? 1 : undefined;
          const cancelButtonIndex = isOwnReview ? 2 : 1;

          ActionSheetIOS.showActionSheetWithOptions(
            {
              options,
              destructiveButtonIndex,
              cancelButtonIndex,
              userInterfaceStyle: isDark ? "dark" : "light",
            },
            (buttonIndex) => {
              if (isOwnReview) {
                if (buttonIndex === 0) {
                  // Edit Caption
                  onEdit?.();
                } else if (buttonIndex === 1) {
                  // Delete Review
                  onDelete?.();
                }
              } else {
                if (buttonIndex === 0) {
                  // Report Review
                  onReport?.();
                }
              }
              onClose();
            }
          );
        }
      }
    }, [visible, isOwnReview, isDark, onDelete, onReport, onEdit, onClose]);

    return null;
  }
);

ActionSheet.displayName = "ActionSheet";

export default ActionSheet;
