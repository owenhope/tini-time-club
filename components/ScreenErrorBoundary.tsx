import React, { useEffect } from "react";
import { View } from "react-native";
import { useRouter, type ErrorBoundaryProps } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppText, Button } from "@/components/shared";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";

/**
 * Fallback for a single screen that throws while rendering. Expo Router
 * wraps each screen in it individually, so the tab bar, other tabs and the
 * rest of the stack keep working; the root ErrorBoundary only catches
 * failures in the layouts themselves.
 */
export default function ScreenErrorBoundary({
  error,
  retry,
}: ErrorBoundaryProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();

  useEffect(() => {
    reportError("[ScreenErrorBoundary] Screen render error:", error);
  }, [error]);

  const leave = () => {
    if (router.canGoBack()) router.back();
    else router.navigate(routes.home());
  };

  return (
    <View style={styles.container} accessibilityRole="alert">
      <Ionicons
        name="alert-circle-outline"
        size={36}
        color={colors.textMuted}
      />
      <AppText variant="heading" style={styles.center}>
        This screen hit a problem
      </AppText>
      <AppText tone="secondary" style={styles.center}>
        The rest of the app is still working. Try again, or go back.
      </AppText>
      <View style={styles.actions}>
        <Button title="Try again" onPress={() => void retry()} />
        <Button title="Go back" variant="ghost" onPress={leave} />
      </View>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.md,
    padding: t.spacing.gutter,
    backgroundColor: t.colors.background,
  },
  center: { textAlign: "center" as const },
  actions: {
    alignSelf: "stretch" as const,
    gap: t.spacing.sm,
    marginTop: t.spacing.sm,
  },
}));
