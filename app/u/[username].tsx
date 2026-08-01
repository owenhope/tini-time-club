import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { makeStyles, useTheme } from "@/theme";
import { routes } from "@/utils/routes";

export default function SharedProfileRedirect() {
  const router = useRouter();
  const styles = useStyles();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ username?: string }>();
  const username = Array.isArray(params.username)
    ? params.username[0]
    : params.username;

  useEffect(() => {
    if (!username) return;
    router.replace(routes.user(username));
  }, [router, username]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.background,
  },
}));
