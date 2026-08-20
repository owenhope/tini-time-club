import React, { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import AppHeader from "@/components/nav/AppHeader";
import { AppleAuth } from "@/components/AppleAuth.native";
import { GoogleAuth } from "@/components/GoogleAuth.native";
import { useProfile } from "@/context/profile-context";
import { makeStyles, useTheme } from "@/theme";
import { routes } from "@/utils/routes";
import { supabase } from "@/utils/supabase";

/**
 * The auth landing. Social sign-in is the promoted path — one tap, no
 * inbox round-trip — so Apple and Google get the stage to themselves and
 * the magic-link flow lives behind a quiet text link at the bottom
 * (/auth/email). Deliberately no email field here.
 */
export const MagicLinkAuthScreen = () => {
  const styles = useStyles();
  const router = useRouter();
  const { colors } = useTheme();
  const { profileError } = useProfile();

  // The root layout keeps this screen mounted after a successful sign-in
  // until the member's profile answers Home vs Onboarding. Track the session
  // here so that gap shows a busy state instead of still-tappable buttons.
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    let isMounted = true;

    void supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted && session) setHasSession(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) setHasSession(true);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // A failed profile read means the root layout will not navigate; surface
  // the buttons again rather than stranding the member on a spinner.
  const isCompletingSignIn = hasSession && !profileError;

  return (
    <View style={styles.container}>
      <AppHeader
        variant="large"
        title="Welcome To The Club"
        meta="One tap and you're in"
      />

      <SafeAreaView style={styles.body} edges={["bottom"]}>
        {isCompletingSignIn ? (
          <View style={styles.completing}>
            <ActivityIndicator size="large" color={colors.accent} />
            <Text style={styles.completingText}>Signing you in…</Text>
          </View>
        ) : (
          <>
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
          </>
        )}
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
  completing: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.md,
  },
  completingText: {
    ...t.typography.bodyStrong,
    color: t.colors.textSecondary,
  },
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
