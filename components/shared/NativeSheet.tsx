import React, { useCallback, useEffect, useRef } from "react";
import { View } from "react-native";
import { BottomSheet, RNHostView } from "@expo/ui";
import { useTheme } from "@/theme";

/** Long enough for the platform's sheet dismissal animation to finish. */
const DISMISS_ANIMATION_MS = 400;

/**
 * A modal sheet drawn by the platform (SwiftUI on iOS, Compose on Android)
 * via Expo UI. It sizes to its React Native content, sits above the tab bar,
 * and dismisses on swipe-down or a tap on the scrim. Callers mount it only
 * while it should be open and unmount it from `onClose`.
 *
 * Use it for short, self-contained sheets. Sheets that need an inline text
 * field pinned above the keyboard, or that must leave the screen behind them
 * interactive (the Explore map), stay on @gorhom/bottom-sheet.
 */
export default function NativeSheet({
  onClose,
  isPresented = true,
  children,
  scrollable = false,
  testID,
}: {
  /** Called once the sheet has fully dismissed, however it was closed. */
  onClose: () => void;
  /**
   * Set false to animate the sheet closed while staying mounted; `onClose`
   * then fires after the dismissal finishes. Use this before presenting other
   * native UI (a share sheet), which iOS refuses while a sheet is animating.
   */
  isPresented?: boolean;
  children: React.ReactNode;
  /**
   * For content with its own scrolling list: the sheet opens at half height,
   * drags to full, and the content fills it instead of sizing the sheet.
   */
  scrollable?: boolean;
  testID?: string;
}) {
  const { colors, spacing } = useTheme();
  // The native sheet reports user dismissals (swipe, scrim) through
  // onDismiss, but not a close requested by flipping isPresented. Report that
  // one ourselves once the animation has finished, and never report twice.
  const reported = useRef(false);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);
  const reportClosed = useCallback(() => {
    if (reported.current) return;
    reported.current = true;
    onCloseRef.current();
  }, []);

  useEffect(() => {
    if (isPresented) {
      reported.current = false;
      return;
    }
    const timer = setTimeout(reportClosed, DISMISS_ANIMATION_MS);
    return () => clearTimeout(timer);
  }, [isPresented, reportClosed]);

  return (
    <BottomSheet
      isPresented={isPresented}
      onDismiss={reportClosed}
      snapPoints={scrollable ? ["half", "full"] : undefined}
      containerColor={colors.surface}
      contentPadding={{
        top: spacing.lg,
        bottom: spacing.xl,
        left: spacing.sheetGutter,
        right: spacing.sheetGutter,
      }}
      testID={testID}
    >
      {/* Width always comes from the sheet so rows reach its edges. A short
          sheet takes its height from the content; a scrollable one fills the
          sheet and lets its list scroll. */}
      <RNHostView matchContents={scrollable ? false : { vertical: true }}>
        <View style={scrollable ? fill : undefined}>{children}</View>
      </RNHostView>
    </BottomSheet>
  );
}

const fill = { flex: 1 } as const;
