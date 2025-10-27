import React, { memo } from "react";
import { ActionSheetIOS, Platform } from "react-native";

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  isOwnReview: boolean;
}

const ActionSheet = memo(
  ({ visible, onClose, onDelete, onReport, isOwnReview }: ActionSheetProps) => {
    React.useEffect(() => {
      if (visible) {
        if (Platform.OS === "ios") {
          const options = isOwnReview
            ? ["Delete Review", "Cancel"]
            : ["Report Review", "Cancel"];

          const destructiveButtonIndex = isOwnReview ? 0 : undefined;
          const cancelButtonIndex = isOwnReview ? 1 : 1;

          ActionSheetIOS.showActionSheetWithOptions(
            {
              options,
              destructiveButtonIndex,
              cancelButtonIndex,
            },
            (buttonIndex) => {
              if (buttonIndex === 0) {
                if (isOwnReview) {
                  // Call onDelete directly - the parent component will handle confirmation
                  onDelete?.();
                } else {
                  onReport?.();
                }
              }
              onClose();
            }
          );
        }
      }
    }, [visible, isOwnReview, onDelete, onReport, onClose]);

    return null;
  }
);

ActionSheet.displayName = "ActionSheet";

export default ActionSheet;
