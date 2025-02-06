import {
  Alert,
  View,
  Button,
  TextInput,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useState } from "react";
import React from "react";
import { supabase } from "@/utils/supabase";
import { AppleAuth } from "@/components/AppleAuth.native";
import { GoogleAuth } from "@/components/GoogleAuth.native";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Sign in with email and password
  const onSignInPress = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  };

  // Create a new user
  const onSignUpPress = async () => {
    setLoading(true);
    const {
      data: { session },
      error,
    } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    if (!session)
      Alert.alert("Please check your inbox for email verification!");

    setLoading(false);
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View
          style={{
            ...StyleSheet.absoluteFillObject,
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
            elevation: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            gap: 10,
          }}
        >
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: "#fff", fontSize: 20 }}>Loading...</Text>
        </View>
      )}
      <Text style={styles.header}>Tini Time Club</Text>
      <TextInput
        autoCapitalize="none"
        placeholder="Email"
        placeholderTextColor={"#ddd"}
        value={email}
        onChangeText={setEmail}
        style={styles.inputField}
      />
      <TextInput
        placeholder="Password"
        placeholderTextColor={"#ddd"}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.inputField}
      />

      <TouchableOpacity onPress={onSignInPress} style={styles.button}>
        <Text style={{ color: "#000" }}>Sign in</Text>
      </TouchableOpacity>
      <Button
        onPress={onSignUpPress}
        title="Create Account"
        color={"#fff"}
      ></Button>
      <View style={{ alignItems: "center", marginTop: 10, gap: 10 }}>
        <AppleAuth />
        <GoogleAuth />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 200,
    padding: 20,
    backgroundColor: "#151515",
  },
  header: {
    fontSize: 30,
    textAlign: "center",
    margin: 50,
    color: "#fff",
  },
  inputField: {
    marginVertical: 4,
    height: 50,
    borderWidth: 1,
    borderColor: "#FFF",
    borderRadius: 4,
    padding: 10,
    color: "#fff",
    backgroundColor: "#363636",
  },
  button: {
    marginVertical: 15,
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 4,
  },
});

export default Login;
