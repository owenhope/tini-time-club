import React from "react";
import { Platform } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";

export function AppleAuth() {
  const router = useRouter();

  // Check if Apple Sign-In is available
  const [isAvailable, setIsAvailable] = React.useState(false);

  React.useEffect(() => {
    const checkAvailability = async () => {
      try {
        const available = await AppleAuthentication.isAvailableAsync();
        setIsAvailable(available);
      } catch (error) {
        console.error(
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
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
        buttonStyle={
          AppleAuthentication.AppleAuthenticationButtonStyle.WHITE_OUTLINE
        }
        cornerRadius={5}
        style={{ width: 220, height: 44 }}
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
              const { data, error } = await supabase.auth.signInWithIdToken({
                provider: "apple",
                token: credential.identityToken,
              });

              if (error) {
                console.error(
                  "[AppleAuth] ❌ Supabase authentication failed:",
                  error
                );
                throw new Error(`Authentication failed: ${error.message}`);
              } else {
                router.replace("/(tabs)/home");
              }
            } else {
              console.error("[AppleAuth] ❌ No identityToken received");
              throw new Error("No identityToken.");
            }
          } catch (e: any) {
            console.error("[AppleAuth] ❌ Apple Sign-In error:", e);

            if (e.code === "ERR_REQUEST_CANCELED") {
              // handle that the user canceled the sign-in flow
            } else {
              console.error("[AppleAuth] ❌ Other error:", e.message || e);
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
