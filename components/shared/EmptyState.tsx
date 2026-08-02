import React from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeStyles, useTheme } from "@/theme";
import AppText from "./AppText";
import Button from "./Button";

export interface EmptyStateProps {
  /** A nudge, not an apology — "Your journal's dry." */
  title: string;
  /** The instruction that follows it. */
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}

/**
 * Every empty list gets one. The brand's voice belongs here — errors stay
 * plain, but an empty state is a place to be funny at no cost to the reader.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  body,
  actionLabel,
  onAction,
  icon,
  style,
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <View style={[styles.wrap, style]}>
      {icon ? (
        <View style={styles.icon}>
          <Ionicons name={icon} size={26} color={colors.accent} />
        </View>
      ) : null}
      <AppText variant="title" style={styles.centered}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="body" tone="muted" style={styles.centered}>
          {body}
        </AppText>
      ) : null}
      {actionLabel && onAction ? (
        <Button
          title={actionLabel}
          onPress={onAction}
          size="medium"
          style={styles.action}
        />
      ) : null}
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  wrap: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.sm,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.xxl,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentTonal,
    marginBottom: t.spacing.xs,
  },
  centered: {
    textAlign: "center" as const,
  },
  action: {
    marginTop: t.spacing.md,
  },
}));

export default EmptyState;
