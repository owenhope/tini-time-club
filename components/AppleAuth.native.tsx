import React from "react";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/utils/supabase";
import AnalyticService from "@/services/analyticsService";
import { AuthProviderButton } from "@/components/AuthProviderButton";
import { useTheme } from "@/theme";
import { reportError } from "@/utils/log";

export function AppleAuth() {
  const { isDark } = useTheme();

  // Check if Apple Sign-In is available
  const [isAvailable, setIsAvailable] = React.useState(false);

  React.useEffect(() => {
    const checkAvailability = async () => {
      try {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAvailable(available);
      } catch (error) {
        reportError(
          "[AppleAuth] Error checking Apple Sign-In availability:",
          error
        );
        setIsAvailable(false);
      }
    };

    checkAvailability();
  }, []);

  if (Platform.OS === "ios" && isAvailable)
    return (
      // Custom per Apple's HIG (Apple mark + "Continue with Apple", solid
      // black or white) instead of the native AppleAuthenticationButton,
      // whose system-font label can't be matched to the Google button —
      // the two must render identically.
      <AuthProviderButton
        title="Continue with Apple"
        backgroundColor={isDark ? "#FFFFFF" : "#000000"}
        textColor={isDark ? "#000000" : "#FFFFFF"}
        icon={
          <Ionicons
            name="logo-apple"
            size={20}
            color={isDark ? "#000000" : "#FFFFFF"}
          />
        }
        onPress={async () => {
          try {
            const credential = await AppleAuthentication.signInAsync({
              requestedScopes: [
                AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                AppleAuthentication.AppleAuthenticationScope.EMAIL,
              ],
            });

            // Sign in or sign up via Supabase Auth.
            if (credential.identityToken) {
              // Supabase will automatically create a new user if they don't exist
              const { error } = await supabase.auth.signInWithIdToken({
                provider: "apple",
                token: credential.identityToken,
              });

              if (error) {
                reportError(
                  "[AppleAuth] ❌ Supabase authentication failed:",
                  error
                );
                throw new Error(`Authentication failed: ${error.message}`);
              } else {
                AnalyticService.capture("login", { method: "apple" });
              }
            } else {
              reportError("[AppleAuth] ❌ No identityToken received");
              throw new Error("No identityToken.");
            }
          } catch (e: any) {
            reportError("[AppleAuth] ❌ Apple Sign-In error:", e);

            if (e.code === "ERR_REQUEST_CANCELED") {
              // handle that the user canceled the sign-in flow
            } else {
              reportError("[AppleAuth] ❌ Other error:", e.message || e);
              // handle other errors
            }
          }
        }}
      />
    );

  if (Platform.OS === "ios" && !isAvailable) {
    return null; // Don't show button if not available
  }

  return <>{/* Implement Android Auth options. */}</>;
}
