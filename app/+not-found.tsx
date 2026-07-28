import { Link, Stack } from "expo-router";
import { View, Text } from "react-native";
import { makeStyles } from "@/theme";

export default function NotFoundScreen() {
  const styles = useStyles();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <Text style={styles.title}>This page doesn&apos;t exist.</Text>
        <Link href="/home" style={styles.link}>
          Back to the feed
        </Link>
      </View>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.md,
    padding: t.spacing.xl,
    backgroundColor: t.colors.background,
  },
  title: {
    ...t.typography.heading,
    color: t.colors.text,
  },
  link: {
    ...t.typography.bodyStrong,
    color: t.colors.accent,
    paddingVertical: t.spacing.md,
  },
}));
