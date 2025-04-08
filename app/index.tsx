import React, { useState, useCallback } from "react";
import {
  Alert,
  View,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { supabase } from "@/utils/supabase";
import { AppleAuth } from "@/components/AppleAuth.native";
import { GoogleAuth } from "@/components/GoogleAuth.native";
import { customEvent } from "vexo-analytics";
const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onSignInPress = useCallback(async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        Alert.alert("Sign In Error", error.message);
      }
    } catch (err: any) {
      Alert.alert(
        "Sign In Error",
        err.message || "An unexpected error occurred"
      );
    } finally {
      customEvent("sign_in", {
        email: email,
      });
      setLoading(false);
    }
  }, [email, password]);

  const onSignUpPress = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.signUp({ email, password });
      if (error) {
        Alert.alert("Sign Up Error", error.message);
      } else if (!session) {
        Alert.alert(
          "Verification",
          "Please check your inbox for email verification!"
        );
      }
    } catch (err: any) {
      Alert.alert(
        "Sign Up Error",
        err.message || "An unexpected error occurred"
      );
    } finally {
      customEvent("sign_up", {
        email: email,
      });
      setLoading(false);
    }
  }, [email, password]);

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      <Text style={styles.logo}>Tini Time Club</Text>
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
      <TouchableOpacity onPress={onSignInPress} style={styles.loginButton}>
        <Text style={styles.loginButtonText}>Log In</Text>
      </TouchableOpacity>
      <Text style={styles.orText}>OR</Text>
      <TouchableOpacity onPress={onSignUpPress} style={styles.signupButton}>
        <Text style={styles.signupButtonText}>Sign Up</Text>
      </TouchableOpacity>
      <View style={styles.authContainer}>
        <AppleAuth />
        <GoogleAuth />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 40,
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
    fontSize: 50,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 40,
    fontFamily: "Billabong", // Instagram's signature font (if available)
  },
  inputField: {
    width: "100%",
    height: 50,
    backgroundColor: "#fafafa",
    borderColor: "#ddd",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginVertical: 8,
    color: "#000",
  },
  loginButton: {
    width: "100%",
    height: 50,
    backgroundColor: "#3897f0", // Instagram blue
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
  orText: {
    marginVertical: 10,
    color: "#999",
    fontWeight: "500",
  },
  signupButton: {
    width: "100%",
    height: 50,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "#3897f0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  signupButtonText: {
    color: "#3897f0",
    fontSize: 16,
    fontWeight: "600",
  },
  authContainer: {
    alignItems: "center",
    gap: 10,
    width: "100%",
    marginTop: 20,
  },
});

export default Login;
