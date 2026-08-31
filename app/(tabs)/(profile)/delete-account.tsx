import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import { useProfile } from "@/context/profile-context";
import { deleteCurrentAccount } from "@/services/accountService";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { clearUserCaches } from "@/utils/signOut";
import { runExpectedSignOut } from "@/utils/authTelemetry";
import { routes } from "@/utils/routes";

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
              await deleteCurrentAccount();

              // Every cache that holds this member's data.
              await clearUserCaches();

              // The server has removed the Auth record. Clear the device's
              // persisted session without making another remote request.
              const { error: signOutError } = await runExpectedSignOut(
                "account-deleted",
                () => supabase.auth.signOut({ scope: "local" })
              );

              if (signOutError) {
                reportError("Error signing out:", signOutError);
              }

              Alert.alert(
                "Account Deleted",
                "Your account has been permanently deleted.",
                [
                  {
                    text: "OK",
                    onPress: () => {
                      // Navigate to login screen
                      router.replace(routes.welcome());
                    },
                  },
                ]
              );
            } catch (error) {
              reportError("Error deleting account:", error);
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
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={true}>
        <Text style={styles.description}>
          Deleting your account permanently removes your profile, reviews,
          comments, reactions, photos, and other account data.
        </Text>

        <Text style={styles.warningText}>This action cannot be undone.</Text>

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
    </View>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  description: {
    ...t.typography.body,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.lg,
  },
  warningText: {
    ...t.typography.bodyStrong,
    color: t.colors.danger,
    textAlign: "left" as const,
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
    marginBottom: t.spacing.sm,
  },
  usernameHint: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.md,
  },
  username: {
    ...t.typography.bodyStrong,
    color: t.colors.usernameText,
  },
  input: {
    ...t.typography.input,
    borderWidth: 1,
    borderColor: t.colors.border,
    borderRadius: t.radius.input,
    paddingHorizontal: 20,
    paddingVertical: t.spacing.md,
    color: t.colors.inputText,
    backgroundColor: t.colors.background,
  },
  deleteButton: {
    backgroundColor: t.colors.danger,
    paddingVertical: t.spacing.lg,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    marginTop: 20,
  },
  deleteButtonDisabled: {
    backgroundColor: t.colors.borderStrong,
  },
  deleteButtonText: {
    ...t.typography.bodyStrong,
    color: t.colors.textOnAccent,
  },
}));

export default DeleteAccount;
