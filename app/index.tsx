import "react-native-get-random-values";
import React, { useState, useCallback, useMemo } from "react";
import {
  Alert,
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import { AppleAuth } from "@/components/AppleAuth.native";
import { GoogleAuth } from "@/components/GoogleAuth.native";
import { Button, Input } from "@/components/shared";
import AnalyticService from "@/services/analyticsService";
import { makeStyles, useTheme } from "@/theme";

const DIMENSIONS = {
  inputHeight: 50,
  buttonHeight: 50,
  borderRadius: 25,
  logoWidth: 400,
  logoHeight: 160,
} as const;

const MESSAGES = {
  signUp: {
    verification: "Please check your inbox for email verification!",
    error: "Sign Up Error",
    invalidEmail: "Please enter a valid email address",
    weakPassword: "Password must be at least 6 characters",
  },
  signIn: {
    error: "Sign In Error",
    invalidEmail: "Please enter a valid email address",
    missingPassword: "Please enter your password",
  },
  forgotPassword: {
    success: "Password Reset Email Sent",
    successMessage:
      "Please check your email for instructions to reset your password.",
    error: "Error",
    emailRequired: "Please enter your email address",
    invalidEmail: "Please enter a valid email address",
  },
  general: {
    loading: "Loading...",
    unexpectedError: "An unexpected error occurred",
  },
} as const;

// Custom hook for form validation
const useFormValidation = () => {
  const validateEmail = useCallback((email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }, []);

  const validatePassword = useCallback((password: string) => {
    return password.length >= 6;
  }, []);

  return { validateEmail, validatePassword };
};

// Custom hook for modal state management
const useModal = (initialState = false) => {
  const [isVisible, setIsVisible] = useState(initialState);

  const show = useCallback(() => setIsVisible(true), []);
  const hide = useCallback(() => setIsVisible(false), []);
  const toggle = useCallback(() => setIsVisible((prev) => !prev), []);

  return { isVisible, show, hide, toggle };
};

// Custom hook for form state management
const useFormState = (initialState: { email: string; password: string }) => {
  const [formData, setFormData] = useState(initialState);

  const updateField = useCallback(
    (field: keyof typeof initialState, value: string) => {
      setFormData((prev) => ({ ...prev, [field]: value }));
    },
    []
  );

  const resetForm = useCallback(() => {
    setFormData(initialState);
  }, [initialState]);

  return { formData, updateField, resetForm };
};

// Reusable UI Components
const LoadingOverlay = ({ visible }: { visible: boolean }) => {
  const styles = useStyles();
  const { colors } = useTheme();

  if (!visible) return null;

  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={colors.textOnImage} />
      <Text style={styles.loadingText}>{MESSAGES.general.loading}</Text>
    </View>
  );
};

// Replaced with shared Input component

// Replaced with shared Button component

const ForgotPasswordModal = ({
  visible,
  email,
  onEmailChange,
  onSend,
  onCancel,
  loading,
}: {
  visible: boolean;
  email: string;
  onEmailChange: (email: string) => void;
  onSend: () => void;
  onCancel: () => void;
  loading: boolean;
}) => {
  const styles = useStyles();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Reset Password</Text>
          <Text style={styles.modalSubtitle}>
            Enter your email address and we&apos;ll send you a link to reset
            your password.
          </Text>
          <Input
            placeholder="Email"
            value={email}
            onChangeText={onEmailChange}
            type="email"
            size="medium"
            variant="default"
          />
          <View style={styles.modalButtonContainer}>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={onCancel}
              disabled={loading}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.modalSendButton}
              onPress={onSend}
              disabled={loading}
            >
              <Text style={styles.modalSendText}>Send Reset Email</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Custom hook for auth operations
const useAuth = () => {
  const [loading, setLoading] = useState(false);
  const { validateEmail, validatePassword } = useFormValidation();

  const signUp = useCallback(
    async (email: string, password: string) => {
      if (!validateEmail(email)) {
        Alert.alert(MESSAGES.signUp.error, MESSAGES.signUp.invalidEmail);
        return false;
      }
      if (!validatePassword(password)) {
        Alert.alert(MESSAGES.signUp.error, MESSAGES.signUp.weakPassword);
        return false;
      }

      setLoading(true);
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.signUp({ email, password });

        if (error) {
          if (
            error.message.includes("already registered") ||
            error.message.includes("User already registered")
          ) {
            const { error: signInError } =
              await supabase.auth.signInWithPassword({ email, password });
            if (signInError) {
              Alert.alert(MESSAGES.signIn.error, signInError.message);
              return false;
            }
            return true;
          }
          Alert.alert(MESSAGES.signUp.error, error.message);
          return false;
        }

        if (session) {
          AnalyticService.capture("create_account", { method: "email" });
          return true;
        } else {
          Alert.alert("Verification", MESSAGES.signUp.verification);
          return false;
        }
      } catch (err: any) {
        Alert.alert(
          MESSAGES.signUp.error,
          err.message || MESSAGES.general.unexpectedError
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [validateEmail, validatePassword]
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      if (!validateEmail(email)) {
        Alert.alert(MESSAGES.signIn.error, MESSAGES.signIn.invalidEmail);
        return false;
      }
      if (!password.trim()) {
        Alert.alert(MESSAGES.signIn.error, MESSAGES.signIn.missingPassword);
        return false;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          Alert.alert(MESSAGES.signIn.error, error.message);
          return false;
        }
        AnalyticService.capture("login", { method: "email" });
        return true;
      } catch (err: any) {
        Alert.alert(
          MESSAGES.signIn.error,
          err.message || MESSAGES.general.unexpectedError
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [validateEmail]
  );

  const resetPassword = useCallback(
    async (email: string) => {
      if (!validateEmail(email)) {
        Alert.alert(
          MESSAGES.forgotPassword.error,
          MESSAGES.forgotPassword.invalidEmail
        );
        return false;
      }

      setLoading(true);
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: "tini-time-club://reset-password",
        });

        if (error) {
          Alert.alert(MESSAGES.forgotPassword.error, error.message);
          return false;
        }

        Alert.alert(
          MESSAGES.forgotPassword.success,
          MESSAGES.forgotPassword.successMessage
        );
        return true;
      } catch (err: any) {
        Alert.alert(
          MESSAGES.forgotPassword.error,
          err.message || MESSAGES.general.unexpectedError
        );
        return false;
      } finally {
        setLoading(false);
      }
    },
    [validateEmail]
  );

  return { loading, signUp, signIn, resetPassword };
};

const Login = () => {
  const styles = useStyles();
  const { colors, isDark } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const { formData, updateField } = useFormState({ email: "", password: "" });
  const forgotPasswordModal = useModal();
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  const { loading, signUp, signIn, resetPassword } = useAuth();

  const onSignInPress = useCallback(async () => {
    if (isSignUp) {
      await signUp(formData.email, formData.password);
    } else {
      await signIn(formData.email, formData.password);
    }
  }, [formData.email, formData.password, isSignUp, signUp, signIn]);

  const handleForgotPassword = useCallback(async () => {
    const success = await resetPassword(forgotPasswordEmail);
    if (success) {
      forgotPasswordModal.hide();
      setForgotPasswordEmail("");
    }
  }, [forgotPasswordEmail, resetPassword, forgotPasswordModal]);

  // Memoized values to prevent unnecessary re-renders
  const buttonText = useMemo(
    () => (isSignUp ? "Create Account" : "Log In"),
    [isSignUp]
  );
  const toggleButtonText = useMemo(
    () => (isSignUp ? "Back to Log In" : "Create Account"),
    [isSignUp]
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <LoadingOverlay visible={loading} />

      <View style={styles.content}>
        <Image
          source={require("@/assets/images/tini-time-logo-2x.png")}
          {...(isDark ? { tintColor: colors.text } : {})}
          style={styles.logo}
          resizeMode="contain"
        />

        <Input
          placeholder="Email"
          value={formData.email}
          onChangeText={(text) => updateField("email", text)}
          type="email"
          size="large"
          variant="default"
        />

        <Input
          placeholder="Password"
          value={formData.password}
          onChangeText={(text) => updateField("password", text)}
          type="password"
          size="large"
          variant="default"
          showPasswordToggle
        />

        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={forgotPasswordModal.show}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <Button
          title={buttonText}
          onPress={onSignInPress}
          disabled={loading}
          loading={loading}
          variant="primary"
          size="large"
          fullWidth
        />

        <View style={styles.authContainer}>
          <AppleAuth />
          <GoogleAuth />
        </View>

        <Button
          title={toggleButtonText}
          onPress={() => setIsSignUp(!isSignUp)}
          disabled={loading}
          variant="outline"
          size="large"
          fullWidth
        />
      </View>

      <ForgotPasswordModal
        visible={forgotPasswordModal.isVisible}
        email={forgotPasswordEmail}
        onEmailChange={setForgotPasswordEmail}
        onSend={handleForgotPassword}
        onCancel={() => {
          forgotPasswordModal.hide();
          setForgotPasswordEmail("");
        }}
        loading={loading}
      />
    </KeyboardAvoidingView>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
    paddingHorizontal: 40,
  },
  content: {
    flex: 1,
    justifyContent: "flex-start" as const,
    alignItems: "center" as const,
    paddingTop: 100,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: t.colors.overlay,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: t.colors.textOnImage,
    fontSize: 18,
  },
  logo: {
    width: DIMENSIONS.logoWidth,
    height: DIMENSIONS.logoHeight,
    marginBottom: 40,
  },
  authContainer: {
    alignItems: "center" as const,
    gap: 10,
    width: "100%" as const,
    marginTop: t.spacing.xl - 4,
    marginBottom: t.spacing.xl - 4,
  },
  forgotPasswordButton: {
    alignSelf: "flex-end" as const,
    marginTop: t.spacing.sm,
    marginBottom: 10,
  },
  forgotPasswordText: {
    color: t.colors.accent,
    fontSize: 14,
    fontWeight: "500" as const,
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    backgroundColor: t.colors.overlay,
  },
  modalContent: {
    backgroundColor: t.colors.surface,
    paddingVertical: t.spacing.xl - 4,
    paddingHorizontal: 40,
    borderRadius: t.radius.md,
    width: "90%" as const,
    alignItems: "center" as const,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold" as const,
    marginBottom: t.spacing.md,
    color: t.colors.text,
  },
  modalSubtitle: {
    fontSize: 16,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: t.spacing.xl - 4,
    lineHeight: 22,
  },
  modalButtonContainer: {
    flexDirection: "row" as const,
    gap: t.spacing.md,
  },
  modalCancelButton: {
    flex: 1,
    height: DIMENSIONS.buttonHeight,
    borderRadius: DIMENSIONS.borderRadius,
    borderWidth: 1,
    borderColor: t.colors.accent,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalCancelText: {
    color: t.colors.accent,
    fontSize: 16,
    fontWeight: "600" as const,
  },
  modalSendButton: {
    flex: 1,
    height: DIMENSIONS.buttonHeight,
    backgroundColor: t.colors.accent,
    borderRadius: DIMENSIONS.borderRadius,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  modalSendText: {
    color: t.colors.onAccent,
    fontSize: 16,
    fontWeight: "600" as const,
  },
}));

export default Login;
