import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text } from "react-native";
import { Image } from "expo-image";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import AnalyticService from "@/services/analyticsService";
import { makeStyles, useTheme } from "@/theme";

export function GoogleAuth() {
  GoogleSignin.configure({
    webClientId:
      "732397011472-41tr3sghlftkc5kcsr57v3570l9uot05.apps.googleusercontent.com",
    iosClientId:
      "732397011472-41tr3sghlftkc5kcsr57v3570l9uot05.apps.googleusercontent.com",
  });
  const styles = useStyles();
  const router = useRouter();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  const onPress = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      if (userInfo.data && userInfo.data.idToken) {
        const { error: signInError } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: userInfo.data.idToken,
        });

        if (signInError) {
          throw new Error(`Authentication failed: ${signInError.message}`);
        }

        AnalyticService.capture("login", { method: "google" });
        router.replace("/home");
      } else {
        throw new Error("No ID token present");
      }
    } catch (error: any) {
      if (
        error.code !== statusCodes.SIGN_IN_CANCELLED &&
        error.code !== statusCodes.IN_PROGRESS &&
        error.code !== statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        Alert.alert(
          "Google Sign-In Unavailable",
          error.message || "Please try again in a moment."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [loading, router]);

  const title = "Continue with Google";

  return (
    <Pressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ busy: loading, disabled: loading }}
      style={({ pressed }) => [
        styles.button,
        pressed && !loading && styles.pressed,
      ]}
    >
      <Image
        source={require("@/assets/images/auth/google-g.png")}
        style={styles.logo}
        contentFit="contain"
      />
      {loading ? (
        <ActivityIndicator size="small" color={colors.text} />
      ) : (
        <Text style={styles.label}>{title}</Text>
      )}
    </Pressable>
  );
}

const useStyles = makeStyles((t) => ({
  button: {
    width: "100%" as const,
    height: 48,
    borderRadius: t.radius.pill,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.isDark ? "#131314" : "#FFFFFF",
    borderWidth: 1,
    borderColor: t.isDark ? "#8E918F" : "#747775",
  },
  logo: {
    position: "absolute" as const,
    left: t.spacing.lg,
    width: 20,
    height: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "600" as const,
    letterSpacing: 0,
    color: t.isDark ? "#E3E3E3" : "#1F1F1F",
  },
  pressed: {
    opacity: 0.82,
  },
}));
