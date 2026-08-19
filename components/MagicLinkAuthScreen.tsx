import React from "react";
import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppHeader from "@/components/nav/AppHeader";
import { AppleAuth } from "@/components/AppleAuth.native";
import { GoogleAuth } from "@/components/GoogleAuth.native";
import { makeStyles } from "@/theme";
import { routes } from "@/utils/routes";

/**
 * The auth landing. Social sign-in is the promoted path — one tap, no
 * inbox round-trip — so Apple and Google get the stage to themselves and
 * the magic-link flow lives behind a quiet text link at the bottom
 * (/auth/email). Deliberately no email field here.
 */
export const MagicLinkAuthScreen = () => {
  const styles = useStyles();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <AppHeader
        variant="large"
        title="Welcome To The Club"
        meta="One tap and you're in"
      />

      <SafeAreaView style={styles.body} edges={["bottom"]}>
        <View style={styles.socialActions}>
          <AppleAuth />
          <GoogleAuth />
        </View>

        <View style={styles.footer}>
          <Pressable
            onPress={() => router.push(routes.authEmail())}
            style={({ pressed }) => pressed && styles.pressed}
            accessibilityRole="link"
            accessibilityLabel="Use email instead"
            hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
          >
            <Text style={styles.emailLink}>Use Email Instead</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  body: {
    flex: 1,
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.xxl,
    paddingBottom: t.spacing.lg,
  },
  socialActions: { gap: t.spacing.md, alignItems: "stretch" as const },
  footer: {
    flex: 1,
    justifyContent: "flex-end" as const,
    alignItems: "center" as const,
  },
  emailLink: {
    ...t.typography.bodyStrong,
    color: t.colors.accent,
    textDecorationLine: "underline" as const,
    paddingVertical: t.spacing.md,
  },
  pressed: { opacity: 0.6 },
}));
