import React, { memo } from "react";
import { ActionSheetIOS, Alert, Platform } from "react-native";
import { useTheme } from "@/theme";

interface ActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onReport?: () => void;
  onEdit?: () => void;
  onShare?: () => void;
  isOwnReview: boolean;
}

const ActionSheet = memo(
  ({
    visible,
    onClose,
    onDelete,
    onReport,
    onEdit,
    onShare,
    isOwnReview,
  }: ActionSheetProps) => {
    // The sheet is drawn by UIKit, so the only themable surface here is which
    // interface style it renders in — otherwise it ignores the in-app override
    // and follows the OS setting.
    const { isDark } = useTheme();

    React.useEffect(() => {
      if (!visible) return;

      const actions = isOwnReview
        ? [
            ...(onShare ? [{ label: "Share Review", action: onShare }] : []),
            ...(onEdit ? [{ label: "Edit Review", action: onEdit }] : []),
            ...(onDelete
              ? [
                  {
                    label: "Delete Review",
                    action: onDelete,
                    destructive: true,
                  },
                ]
              : []),
          ]
        : [
            ...(onShare ? [{ label: "Share Review", action: onShare }] : []),
            ...(onReport ? [{ label: "Report Review", action: onReport }] : []),
          ];

      if (Platform.OS === "ios") {
        const options = [...actions.map((action) => action.label), "Cancel"];
        const destructiveButtonIndex = actions.findIndex(
          (action) => action.destructive
        );
        const cancelButtonIndex = options.length - 1;

        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            destructiveButtonIndex:
              destructiveButtonIndex >= 0 ? destructiveButtonIndex : undefined,
            cancelButtonIndex,
            userInterfaceStyle: isDark ? "dark" : "light",
          },
          (buttonIndex) => {
            if (buttonIndex < actions.length) {
              actions[buttonIndex].action();
            }
            onClose();
          }
        );
        return;
      }

      Alert.alert(
        "Review options",
        undefined,
        [
          ...actions.map((action) => ({
            text: action.label,
            style: action.destructive ? ("destructive" as const) : undefined,
            onPress: action.action,
          })),
          { text: "Cancel", style: "cancel" as const },
        ],
        { onDismiss: onClose }
      );
    }, [
      visible,
      isOwnReview,
      isDark,
      onDelete,
      onReport,
      onEdit,
      onShare,
      onClose,
    ]);

    return null;
  }
);

ActionSheet.displayName = "ActionSheet";

export default ActionSheet;
