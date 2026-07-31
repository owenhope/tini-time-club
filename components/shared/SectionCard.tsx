import React from "react";
import { View, ViewStyle } from "react-native";
import { makeStyles } from "@/theme";
import AppText from "./AppText";

export interface SectionCardProps {
  title?: string;
  /** Rendered opposite the title, e.g. a "See all" action. */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** Removes the card chrome, keeping only the title and spacing. */
  plain?: boolean;
  style?: ViewStyle;
}

/**
 * The grouping primitive for profile content. Every section on the user,
 * place and review surfaces uses this so the spacing rhythm, corner radius
 * and heading treatment stay identical across all three.
 */
const SectionCard: React.FC<SectionCardProps> = ({
  title,
  action,
  children,
  plain = false,
  style,
}) => {
  const styles = useStyles();

  return (
    <View style={[styles.wrapper, style]}>
      {(title || action) && (
        <View style={styles.header}>
          {title ? (
            // Announced as a heading so screen-reader users can jump between
            // sections instead of reading the whole profile linearly.
            <AppText
              variant="label"
              tone="muted"
              style={styles.title}
              accessibilityRole="header"
              numberOfLines={1}
            >
              {title}
            </AppText>
          ) : (
            <View />
          )}
          {action}
        </View>
      )}
      <View style={plain ? styles.plainBody : styles.body}>{children}</View>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  wrapper: {
    marginBottom: t.spacing.lg,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    marginBottom: t.spacing.sm,
    paddingHorizontal: t.spacing.lg,
  },
  title: {
    textTransform: "uppercase" as const,
    flexShrink: 1,
  },
  body: {
    backgroundColor: t.colors.surface,
    borderRadius: t.radius.lg,
    padding: t.spacing.lg,
    marginHorizontal: t.spacing.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  plainBody: {
    paddingHorizontal: t.spacing.lg,
  },
}));

export default SectionCard;
