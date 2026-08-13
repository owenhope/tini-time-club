import React from "react";
import { View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AppText from "@/components/shared/AppText";
import { makeStyles, useTheme } from "@/theme";

export default function ActivityEmptyState() {
  const styles = useStyles();
  const { colors } = useTheme();
  return (
    <View style={styles.container}>
      <View style={styles.icon}>
        <Ionicons name="heart-outline" size={28} color={colors.accent} />
      </View>
      <AppText variant="heading">No activity yet</AppText>
      <AppText variant="body" tone="secondary" style={styles.copy}>
        Follows, likes, and comments from the club will appear here.
      </AppText>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: t.spacing.xxl,
    gap: t.spacing.md,
  },
  icon: {
    width: 64,
    height: 64,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accentSubtle,
    marginBottom: t.spacing.sm,
  },
  copy: {
    textAlign: "center" as const,
    maxWidth: 280,
  },
}));
