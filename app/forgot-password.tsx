import React, { useCallback, useState } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Button, Input } from "@/components/shared";
import { useAuth } from "@/hooks/useAuth";
import { makeStyles, useTheme } from "@/theme";

export default function ForgotPassword() {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { loading, resetPassword } = useAuth();
  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : ""
  );

  const onSubmit = useCallback(async () => {
    const sent = await resetPassword(email);
    if (sent) router.back();
  }, [email, resetPassword, router]);

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
            <Image
              key={isDark ? "forgot-logo-dark" : "forgot-logo-light"}
              source={require("@/assets/images/tini-time-logo-2x.png")}
              style={[
                styles.logo,
                { tintColor: isDark ? colors.text : undefined },
              ]}
              resizeMode="contain"
              accessibilityRole="image"
              accessibilityLabel="Tini Time Club"
            />
            <View style={styles.navSpacer} />
          </View>

          <View style={styles.intro}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.instructions}>
              We&apos;ll email you a link to choose a new password.
            </Text>
          </View>

          <View style={styles.form}>
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
          </View>

          <View style={styles.actions}>
            <Button
              title="Send Reset Link"
              onPress={onSubmit}
              variant="primary"
              size="large"
              fullWidth
              disabled={loading}
              loading={loading}
              icon="arrow-forward"
              iconPosition="right"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
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
    justifyContent: "space-between" as const,
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
  logo: {
    width: 112,
    height: 48,
  },
  navSpacer: {
    width: 44,
  },
  intro: {
    paddingTop: t.spacing.xxxl,
    paddingBottom: t.spacing.xl,
    gap: t.spacing.sm,
  },
  title: {
    ...t.typography.metricLarge,
    letterSpacing: 0,
    color: t.colors.text,
  },
  instructions: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    lineHeight: 22,
  },
  form: {
    gap: t.spacing.xs,
  },
  inputOuter: {
    marginVertical: t.spacing.xs,
  },
  input: {
    borderRadius: t.radius.input,
    borderCurve: "continuous" as const,
    backgroundColor: t.colors.surfaceRaised,
  },
  actions: {
    paddingTop: t.spacing.xxl,
  },
  pressed: {
    opacity: 0.6,
  },
}));
