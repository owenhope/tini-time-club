import React, { useState } from "react";
import {
  View,
  Text,
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
import { unregisterPushNotificationsAsync } from "@/services/pushNotificationService";
import { makeStyles, useTheme } from "@/theme";

const DeleteAccount = () => {
  const styles = useStyles();
  const { colors } = useTheme();
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

              await unregisterPushNotificationsAsync();

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
                    },
                  },
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
          <Ionicons name="arrow-back" size={24} color={colors.text} />
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
            placeholderTextColor={colors.textMuted}
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

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  header: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  backButton: {
    padding: t.spacing.sm,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "600" as const,
    color: t.colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  warningContainer: {
    alignItems: "center" as const,
    marginBottom: 20,
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: t.colors.danger,
    marginTop: t.spacing.md,
    textAlign: "center" as const,
  },
  description: {
    fontSize: 15,
    color: t.colors.textSecondary,
    lineHeight: 22,
    marginBottom: t.spacing.lg,
  },
  listContainer: {
    marginBottom: 20,
  },
  listItem: {
    fontSize: 13,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.sm,
    lineHeight: 20,
  },
  warningText: {
    fontSize: 15,
    color: t.colors.danger,
    fontWeight: "600" as const,
    textAlign: "left" as const,
    marginBottom: 30,
    lineHeight: 22,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    color: t.colors.text,
    marginBottom: t.spacing.sm,
    fontWeight: "500" as const,
  },
  usernameHint: {
    fontSize: 13,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.md,
  },
  username: {
    fontWeight: "600" as const,
    color: t.colors.accent,
  },
  input: {
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: t.spacing.md,
    fontSize: 15,
    color: t.colors.text,
    backgroundColor: t.colors.background,
  },
  deleteButton: {
    backgroundColor: t.colors.danger,
    paddingVertical: t.spacing.lg,
    borderRadius: 25,
    alignItems: "center" as const,
    marginTop: 20,
  },
  deleteButtonDisabled: {
    backgroundColor: t.colors.borderStrong,
  },
  deleteButtonText: {
    color: t.colors.textOnAccent,
    fontSize: 15,
    fontWeight: "600" as const,
  },
}));

export default DeleteAccount;
