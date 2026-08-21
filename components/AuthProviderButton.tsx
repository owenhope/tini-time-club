import React from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { makeStyles } from "@/theme";

/**
 * The one shape both social sign-in buttons render through, so "Continue
 * with Apple" and "Continue with Google" cannot drift apart in height,
 * radius, type, or icon placement. Colors stay with the callers because the
 * providers' brand guidelines dictate them.
 */
export function AuthProviderButton({
  title,
  onPress,
  icon,
  backgroundColor,
  borderColor,
  textColor,
  loading = false,
  disabled = false,
}: {
  title: string;
  onPress: () => void;
  icon: React.ReactNode;
  backgroundColor: string;
  /** Omit for borderless buttons (e.g. Apple's solid black). */
  borderColor?: string;
  textColor: string;
  loading?: boolean;
  disabled?: boolean;
}) {
  const styles = useStyles();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: loading, disabled: disabled || loading }}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor,
          borderColor: borderColor ?? backgroundColor,
        },
        pressed && !loading && styles.pressed,
      ]}
    >
      <View style={styles.logo}>{icon}</View>
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <Text style={[styles.label, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    width: "100%" as const,
    height: 48,
    borderRadius: t.radius.pill,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
  },
  logo: {
    position: "absolute" as const,
    left: t.spacing.lg,
    width: 20,
    height: 20,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  label: {
    ...t.typography.bodyStrong,
    letterSpacing: 0,
  },
  pressed: {
    opacity: 0.82,
  },
}));
