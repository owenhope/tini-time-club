import React from "react";
import { Pressable } from "react-native";
import AppText from "./AppText";
import { makeStyles, useTheme } from "@/theme";

export interface FollowButtonProps {
  following: boolean;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  following,
  loading = false,
  disabled = false,
  compact = false,
  onPress,
  accessibilityLabel,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={loading || disabled}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? (following ? "Following" : "Follow back")
      }
      accessibilityState={{
        disabled: loading || disabled,
        selected: following,
      }}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        following ? styles.following : styles.notFollowing,
        pressed && !loading && !disabled && styles.pressed,
      ]}
    >
      <AppText
        variant="label"
        tone={following ? "secondary" : "onAccent"}
        style={{ color: following ? colors.secondary : colors.onAccent }}
      >
        {loading ? "…" : following ? "Following" : "Follow back"}
      </AppText>
    </Pressable>
  );
};

const useStyles = makeStyles((t) => ({
  button: {
    minWidth: 92,
    minHeight: 44,
    paddingHorizontal: t.spacing.md,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderWidth: 1,
  },
  compact: {
    minWidth: 80,
    minHeight: 32,
    paddingHorizontal: t.spacing.sm,
  },
  notFollowing: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.accent,
  },
  following: {
    backgroundColor: t.colors.surface,
    borderColor: t.colors.borderStrong,
  },
  pressed: {
    opacity: 0.72,
  },
}));

export default FollowButton;
