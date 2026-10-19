import React from "react";
import { View } from "react-native";
import AppText from "@/components/shared/AppText";
import { makeStyles } from "@/theme";

export default function ProfileEmptyState({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title?: string;
  children?: React.ReactNode;
}) {
  const styles = useStyles();
  return (
    <View style={styles.container}>
      <View style={styles.icon}>{icon}</View>
      {title ? (
        <AppText variant="heading" style={styles.center}>
          {title}
        </AppText>
      ) : null}
      {typeof children === "string" ? (
        <AppText tone="secondary" style={styles.body}>
          {children}
        </AppText>
      ) : (
        children
      )}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    alignItems: "center" as const,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.xxl,
    gap: t.spacing.md,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentSubtle,
  },
  center: { textAlign: "center" as const },
  body: { maxWidth: 300, textAlign: "center" as const },
}));
