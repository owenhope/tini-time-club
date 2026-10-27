import { useCallback, useState } from "react";
import { Alert } from "react-native";
import * as Linking from "expo-linking";
import { supabase } from "@/utils/supabase";

const AUTH_MESSAGES = {
  magicLink: {
    error: "Magic Link Error",
    invalidEmail: "Please enter a valid email address",
  },
  password: {
    error: "Sign In Error",
    missing: "Please enter your password",
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

  // Reviewer accounts only (see utils/reviewerAccount). The root layout's
  // SIGNED_IN handler routes onward, same as after a magic link.
  const signInWithPassword = useCallback(
    async (email: string, password: string) => {
      if (!password) {
        Alert.alert(
          AUTH_MESSAGES.password.error,
          AUTH_MESSAGES.password.missing
        );
        return false;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          Alert.alert(AUTH_MESSAGES.password.error, error.message);
          return false;
        }

        return true;
      } catch (err: any) {
        Alert.alert(
          AUTH_MESSAGES.password.error,
          err.message || AUTH_MESSAGES.general.unexpectedError
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { loading, continueWithEmail, signInWithPassword };
};
