import React, { useCallback, useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AppHeader from "@/components/nav/AppHeader";
import { Button, Input } from "@/components/shared";
import { useAuth } from "@/hooks/useAuth";
import { makeStyles, useTheme } from "@/theme";

const RESEND_SECONDS = 30;

/**
 * The magic-link fallback behind the landing screen's "Use Email Instead"
 * link. Social sign-in is the promoted path; this one owns the inbox
 * round-trip: send the link, count down the resend, let them correct a typo.
 */
export default function EmailAuth() {
  const styles = useStyles();
  const { colors } = useTheme();
  const { loading, continueWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

  const router = useRouter();

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = setTimeout(() => setResendIn((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendIn]);

  const sendLink = useCallback(async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const didSend = await continueWithEmail(normalizedEmail);
    if (didSend) {
      setSentTo(normalizedEmail);
      setResendIn(RESEND_SECONDS);
    }
  }, [continueWithEmail, email]);

  const changeEmail = useCallback(() => {
    setSentTo(null);
    setResendIn(0);
  }, []);

  return (
    <View style={styles.container}>
      {/* Variant A like every other screen; the way back to the landing is
          the footer link (and the iOS swipe-back gesture). */}
      <AppHeader
        variant="large"
        title="Sign in with email"
        meta="We'll send you a one-time sign-in link"
      />
      {/* Same bottom safe-area wrapper as the landing screen, so the footer
          link sits at the identical height on both. */}
      <SafeAreaView style={styles.flex} edges={["bottom"]}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={styles.content}
          >
          {sentTo ? (
            <View style={styles.sentContent}>
              <View style={styles.sentIcon}>
                <Ionicons
                  name="mail-open-outline"
                  size={30}
                  color={colors.textOnImage}
                />
              </View>
              <Text style={styles.sentTitle}>Check your email</Text>
              <Text style={styles.sentText}>
                We sent a one-time sign-in link to{"\n"}
                <Text style={styles.email}>{sentTo}</Text>
              </Text>
              <Button
                title={resendIn > 0 ? `Resend in ${resendIn}s` : "Resend link"}
                onPress={sendLink}
                variant="tonal"
                size="large"
                fullWidth
                disabled={loading || resendIn > 0}
                loading={loading}
              />
              <Button
                title="Use a different email"
                onPress={changeEmail}
                variant="ghost"
                size="medium"
                fullWidth
                disabled={loading}
              />
            </View>
          ) : (
            <>
              <Input
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                type="email"
                size="medium"
                variant="default"
                style={styles.input}
                containerStyle={styles.inputOuter}
              />

              <View style={styles.actions}>
                <Button
                  title="Continue with Email"
                  onPress={sendLink}
                  variant="primary"
                  size="medium"
                  fullWidth
                  disabled={loading}
                  loading={loading}
                  icon="arrow-forward"
                  iconPosition="right"
                />
              </View>
            </>
          )}

            <View style={styles.footer}>
              <Pressable
                onPress={() => router.back()}
                style={({ pressed }) => pressed && styles.pressed}
                accessibilityRole="link"
                accessibilityLabel="Other ways to sign in"
                hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
              >
                <Text style={styles.backLink}>Other ways to Sign In</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1 },
  // Identical geometry to the landing screen's body, so the footer links on
  // the two auth screens sit at the same height on the same ground.
  content: {
    flexGrow: 1,
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.xxl,
    paddingBottom: t.spacing.lg,
  },
  sentTitle: {
    ...t.typography.display,
    letterSpacing: 0,
    color: t.colors.text,
    textAlign: "center" as const,
  },
  inputOuter: { marginVertical: t.spacing.xs },
  // The app's standard field shape (see onboarding's username input):
  // radius.input corners on the page ground, no leading icon.
  input: {
    borderRadius: t.radius.input,
    backgroundColor: t.colors.background,
  },
  actions: { paddingTop: t.spacing.xl, gap: t.spacing.md },
  sentContent: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    gap: t.spacing.lg,
    paddingBottom: 72,
  },
  sentIcon: {
    width: 64,
    height: 64,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.tabBarActive,
  },
  sentText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: t.spacing.md,
  },
  email: { ...t.typography.bodyStrong, color: t.colors.text },
  // Mirrors the landing's "Use Email Instead" link, so the two screens read
  // as one flow.
  footer: {
    flex: 1,
    justifyContent: "flex-end" as const,
    alignItems: "center" as const,
    paddingTop: t.spacing.xl,
  },
  backLink: {
    ...t.typography.bodyStrong,
    color: t.colors.accent,
    textDecorationLine: "underline" as const,
    paddingVertical: t.spacing.md,
  },
  pressed: { opacity: 0.6 },
}));
