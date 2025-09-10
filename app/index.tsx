import React, { useState, useCallback } from "react";
import {
  Alert,
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { AppleAuth } from "@/components/AppleAuth.native";
import { GoogleAuth } from "@/components/GoogleAuth.native";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");

  const onSignInPress = useCallback(async () => {
    setLoading(true);
    try {
      if (isSignUp) {
        // Sign up logic
        const {
          data: { session },
          error,
        } = await supabase.auth.signUp({ email, password });
        if (error) {
          // If account already exists, try to sign them in instead
          if (
            error.message.includes("already registered") ||
            error.message.includes("User already registered")
          ) {
            const { error: signInError } =
              await supabase.auth.signInWithPassword({
                email,
                password,
              });
            if (signInError) {
              Alert.alert("Sign In Error", signInError.message);
            }
            // If sign in successful, navigation will happen automatically via auth state change
          } else {
            Alert.alert("Sign Up Error", error.message);
          }
        } else if (session) {
          // Account created successfully and user is signed in
          // Navigation will happen automatically via auth state change
        } else {
          // Account created but needs email verification
          Alert.alert(
            "Verification",
            "Please check your inbox for email verification!"
          );
        }
      } else {
        // Sign in logic
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          Alert.alert("Sign In Error", error.message);
        }
      }
    } catch (err: any) {
      Alert.alert(
        isSignUp ? "Sign Up Error" : "Sign In Error",
        err.message || "An unexpected error occurred"
      );
    } finally {
      setLoading(false);
    }
  }, [email, password, isSignUp]);

  const handleForgotPassword = useCallback(async () => {
    if (!forgotPasswordEmail.trim()) {
      Alert.alert("Error", "Please enter your email address");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        forgotPasswordEmail,
        {
          redirectTo: "tini-time-club://reset-password", // Deep link for password reset
        }
      );

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert(
          "Password Reset Email Sent",
          "Please check your email for instructions to reset your password."
        );
        setShowForgotPassword(false);
        setForgotPasswordEmail("");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }, [forgotPasswordEmail]);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      <View style={styles.content}>
        <Image
          source={require("@/assets/images/tini-time-logo-2x.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <TextInput
          autoCapitalize="none"
          placeholder="Email"
          placeholderTextColor="#999"
          value={email}
          onChangeText={setEmail}
          style={styles.inputField}
        />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#999"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          style={styles.inputField}
        />
        <TouchableOpacity
          style={styles.forgotPasswordButton}
          onPress={() => setShowForgotPassword(true)}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onSignInPress} style={styles.loginButton}>
          <Text style={styles.loginButtonText}>
            {isSignUp ? "Create Account" : "Log In"}
          </Text>
        </TouchableOpacity>
        <View style={styles.authContainer}>
          <AppleAuth />
          <GoogleAuth />
        </View>
      </View>
      <TouchableOpacity
        style={styles.createAccountButton}
        onPress={() => setIsSignUp(!isSignUp)}
      >
        <Text style={styles.createAccountButtonText}>
          {isSignUp ? "Back to Log In" : "Create Account"}
        </Text>
      </TouchableOpacity>

      {/* Forgot Password Modal */}
      <Modal visible={showForgotPassword} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address and we'll send you a link to reset your
              password.
            </Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              placeholderTextColor="#999"
              value={forgotPasswordEmail}
              onChangeText={setForgotPasswordEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowForgotPassword(false);
                  setForgotPasswordEmail("");
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSendButton}
                onPress={handleForgotPassword}
                disabled={loading}
              >
                <Text style={styles.modalSendText}>Send Reset Email</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 40,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  loadingText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 18,
  },
  logo: {
    width: 400,
    height: 160,
    marginBottom: 40,
  },
  inputField: {
    width: "100%",
    height: 50,
    backgroundColor: "#fafafa",
    borderColor: "#10B981", // Green border
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 8,
    color: "#000",
  },
  loginButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#10B981", // Green from Tini Time Club
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  loginButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  authContainer: {
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginTop: 20,
  },
  createAccountButton: {
    width: "100%",
    height: 50,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#10B981", // Green border
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 40,
    marginTop: "auto",
  },
  createAccountButtonText: {
    color: "#10B981", // Green text
    fontSize: 16,
    fontWeight: "600",
  },
  forgotPasswordButton: {
    alignSelf: "flex-end",
    marginTop: 8,
    marginBottom: 10,
  },
  forgotPasswordText: {
    color: "#10B981", // Green text
    fontSize: 14,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "#fff",
    paddingVertical: 20,
    paddingHorizontal: 40,
    borderRadius: 8,
    width: "90%",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#000",
  },
  modalSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 22,
  },
  modalInput: {
    width: "100%",
    height: 50,
    backgroundColor: "#fafafa",
    borderColor: "#10B981",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 20,
    color: "#000",
  },
  modalButtonContainer: {
    flexDirection: "row",
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    height: 50,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelText: {
    color: "#10B981",
    fontSize: 16,
    fontWeight: "600",
  },
  modalSendButton: {
    flex: 1,
    height: 50,
    backgroundColor: "#10B981",
    borderRadius: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSendText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default Login;
