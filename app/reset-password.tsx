import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { Button, Input } from "@/components/shared";

const MIN_PASSWORD_LENGTH = 8;

/**
 * Landing screen for the password-recovery deep link
 * (tini-time-club://reset-password, sent by supabase.auth.resetPasswordForEmail).
 *
 * Supabase's deep-link handler establishes a short-lived recovery session before
 * this screen mounts, so updateUser is all that's needed to set a new password.
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;
      setHasRecoverySession(!!session);
      setCheckingSession(false);
    };

    check();

    // The recovery session can land a moment after the screen mounts.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || session) {
        setHasRecoverySession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async () => {
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    Alert.alert("Password updated", "You can now use your new password.", [
      { text: "OK", onPress: () => router.replace("/(tabs)/home") },
    ]);
  };

  if (checkingSession) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#B6A3E2" />
      </View>
    );
  }

  if (!hasRecoverySession) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.title}>Link expired</Text>
        <Text style={styles.body}>
          This password reset link is no longer valid. Request a new one from
          the login screen.
        </Text>
        <Button title="Back to login" onPress={() => router.replace("/")} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <Text style={styles.title}>Set a new password</Text>

        <Input
          placeholder="New password"
          value={password}
          onChangeText={setPassword}
          type="password"
          size="large"
          showPasswordToggle
        />

        <Input
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          type="password"
          size="large"
          showPasswordToggle
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Button
          title={loading ? "Saving..." : "Update password"}
          onPress={handleSubmit}
          disabled={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  centered: { justifyContent: "center", alignItems: "center", padding: 24 },
  content: { flex: 1, justifyContent: "center", padding: 24, gap: 12 },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  body: {
    fontSize: 15,
    color: "#555",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  error: { color: "#C0392B", fontSize: 14, marginTop: 4 },
});
