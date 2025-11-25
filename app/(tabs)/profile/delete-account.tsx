import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import authCache from "@/utils/authCache";

const DeleteAccount = () => {
  const router = useRouter();
  const { profile } = useProfile();
  const [username, setUsername] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (!profile) return;

    if (username !== profile.username) {
      Alert.alert("Error", "Username does not match. Please try again.");
      return;
    }

    Alert.alert(
      "Delete Account",
      "Are you absolutely sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setIsDeleting(true);
            try {
              // Soft delete: Mark profile as deleted instead of actually deleting
              const { error: profileError } = await supabase
                .from("profiles")
                .update({
                  deleted: true,
                  deleted_at: new Date().toISOString(),
                  username: `deleted_user_${Date.now()}`, // Make username unique for deleted users
                })
                .eq("id", profile.id);

              if (profileError) {
                console.error(
                  "Error marking profile as deleted:",
                  profileError
                );
                throw profileError;
              }

              // Clear cache first
              await authCache.invalidateCache();
              
              // Sign out the user
              const { error: signOutError } = await supabase.auth.signOut();
              
              if (signOutError) {
                console.error("Error signing out:", signOutError);
              }

              Alert.alert(
                "Account Deleted",
                "Your account has been permanently deleted.",
                [
                  { 
                    text: "OK",
                    onPress: () => {
                      // Navigate to login screen
                      router.replace("/");
                    }
                  }
                ]
              );
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(
                "Error",
                "There was an error deleting your account. Please try again or contact support."
              );
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  const isDeleteEnabled = username === profile?.username && !isDeleting;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delete Account</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={styles.description}>
          Deleting your account will permanently deactivate your profile and
          make it inaccessible to other users.
        </Text>

        <Text style={styles.warningText}>
          This action will permanently deactivate your account and cannot be
          undone.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>
            To confirm deletion, please type your username:
          </Text>
          <Text style={styles.usernameHint}>
            Your username is:{" "}
            <Text style={styles.username}>{profile?.username}</Text>
          </Text>
          <TextInput
            style={styles.input}
            value={username}
            onChangeText={setUsername}
            placeholder="Enter your username"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.deleteButton,
            !isDeleteEnabled && styles.deleteButtonDisabled,
          ]}
          onPress={handleDeleteAccount}
          disabled={!isDeleteEnabled}
        >
          <Text style={styles.deleteButtonText}>
            {isDeleting ? "Deleting Account..." : "Delete My Account"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ff4444",
    marginTop: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#333",
    lineHeight: 22,
    marginBottom: 16,
  },
  listContainer: {
    marginBottom: 20,
  },
  listItem: {
    fontSize: 14,
    color: "#333",
    marginBottom: 8,
    lineHeight: 20,
  },
  warningText: {
    fontSize: 16,
    color: "#ff4444",
    fontWeight: "600",
    textAlign: "left",
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    color: "#333",
    marginBottom: 8,
    fontWeight: "500",
  },
  usernameHint: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  username: {
    fontWeight: "600",
    color: "#B6A3E2",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  deleteButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
  },
  deleteButtonDisabled: {
    backgroundColor: "#ccc",
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default DeleteAccount;
