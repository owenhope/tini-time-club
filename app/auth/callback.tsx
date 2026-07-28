import React from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { makeStyles, useTheme } from "@/theme";

export default function AuthCallback() {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <ActivityIndicator size="large" color={colors.accent} />
        <Text style={styles.title}>Signing you in...</Text>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  content: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.lg,
  },
  title: { ...t.typography.heading, color: t.colors.text },
}));
