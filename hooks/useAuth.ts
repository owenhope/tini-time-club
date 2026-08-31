import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "@/utils/supabase";

const AUTH_MESSAGES = {
  magicLink: {
    error: "Magic Link Error",
    invalidEmail: "Please enter a valid email address",
  },
  general: {
    unexpectedError: "An unexpected error occurred",
  },
} as const;

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export const useAuth = () => {
  const [loading, setLoading] = useState(false);

  const continueWithEmail = useCallback(async (email: string) => {
    if (!isValidEmail(email)) {
      Alert.alert(
        AUTH_MESSAGES.magicLink.error,
        AUTH_MESSAGES.magicLink.invalidEmail
      );
      return false;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: Linking.createURL("/auth/callback"),
        },
      });

      if (error) {
        Alert.alert(AUTH_MESSAGES.magicLink.error, error.message);
        return false;
      }

      return true;
    } catch (err: any) {
      Alert.alert(
        AUTH_MESSAGES.magicLink.error,
        err.message || AUTH_MESSAGES.general.unexpectedError
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, continueWithEmail };
};
