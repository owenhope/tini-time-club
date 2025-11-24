import React, { memo } from "react";
import { ActionSheetIOS, Platform } from "react-native";

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onEdit?: () => void;
  isOwnReview: boolean;
}

const ActionSheet = memo(
  ({ visible, onClose, onDelete, onReport, onEdit, isOwnReview }: ActionSheetProps) => {
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
    }, [visible, isOwnReview, onDelete, onReport, onEdit, onClose]);

    return null;
  }
);

ActionSheet.displayName = "ActionSheet";

export default ActionSheet;
