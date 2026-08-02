import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppleAuth } from "@/components/AppleAuth.native";
import { GoogleAuth } from "@/components/GoogleAuth.native";
import { Button, Input } from "@/components/shared";
import { useAuth } from "@/hooks/useAuth";
import { makeStyles, useTheme } from "@/theme";

const RESEND_SECONDS = 30;

export const MagicLinkAuthScreen = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { loading, continueWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);

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
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.nav}>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </Pressable>
          </View>

          {sentTo ? (
            <View style={styles.sentContent}>
              <View style={styles.sentIcon}>
                <Ionicons
                  name="mail-open-outline"
                  size={30}
                  color={colors.accent}
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
              <View style={styles.intro}>
                <Text style={styles.title}>Welcome To The Club</Text>
              </View>

              <Input
                label="Email address"
                placeholder="you@example.com"
                value={email}
                onChangeText={setEmail}
                type="email"
                size="large"
                variant="default"
                leftIcon="mail-outline"
                style={styles.input}
                containerStyle={styles.inputOuter}
              />

              <View style={styles.actions}>
                <Button
                  title="Continue with Email"
                  onPress={sendLink}
                  variant="primary"
                  size="large"
                  fullWidth
                  disabled={loading}
                  loading={loading}
                  icon="arrow-forward"
                  iconPosition="right"
                />

                <View style={styles.dividerRow}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or continue with</Text>
                  <View style={styles.dividerLine} />
                </View>

                <View style={styles.socialActions}>
                  <AppleAuth />
                  <GoogleAuth />
                </View>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
};

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  flex: { flex: 1 },
  content: {
    flexGrow: 1,
    paddingHorizontal: t.spacing.xl,
    paddingTop: t.spacing.sm,
    paddingBottom: t.spacing.lg,
  },
  nav: {
    minHeight: 52,
    flexDirection: "row" as const,
    alignItems: "center" as const,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surfaceRaised,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  intro: { paddingTop: t.spacing.xl, paddingBottom: t.spacing.xl },
  title: {
    ...t.typography.metricLarge,
    letterSpacing: 0,
    color: t.colors.text,
  },
  sentTitle: {
    ...t.typography.metricLarge,
    letterSpacing: 0,
    color: t.colors.text,
    textAlign: "center" as const,
  },
  inputOuter: { marginVertical: t.spacing.xs },
  input: {
    borderRadius: t.radius.input,
    borderCurve: "continuous" as const,
    backgroundColor: t.colors.surfaceRaised,
  },
  actions: { paddingTop: t.spacing.xxl, gap: t.spacing.md },
  dividerRow: {
    minHeight: 28,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: t.colors.border },
  dividerText: { ...t.typography.caption, color: t.colors.textMuted },
  socialActions: { gap: t.spacing.md, alignItems: "stretch" as const },
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
    backgroundColor: t.colors.accentTonal,
  },
  sentText: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    lineHeight: 24,
    marginBottom: t.spacing.md,
  },
  email: { ...t.typography.bodyStrong, color: t.colors.text },
  pressed: { opacity: 0.6 },
}));
