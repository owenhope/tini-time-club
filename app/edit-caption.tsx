import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import databaseService from "@/services/databaseService";
import { supabase } from "@/utils/supabase";
import { fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";

const EditCaption = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ reviewId: string }>();
  // A caller navigating with an undefined id produces the literal string
  // "undefined" in the URL, so guard both shapes.
  const reviewId =
    params.reviewId && params.reviewId !== "undefined" ? params.reviewId : null;
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadReview = useCallback(async () => {
    if (!reviewId) {
      // Nothing actionable for the user here — just leave quietly.
      reportError("edit-caption opened without a reviewId");
      router.back();
      return;
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) {
        Alert.alert("Error", "Please sign in again to edit this review");
        router.back();
        return;
      }

      const { data, error } = await supabase
        .from("reviews")
        .select("id, comment")
        .eq("id", reviewId)
        .eq("user_id", user.id)
        .eq("state", 1)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        Alert.alert("Error", "You can only edit your own reviews");
        router.back();
        return;
      }

      setCaption(data.comment || "");
    } catch (error) {
      reportError("Error loading review:", error);
      Alert.alert("Error", "Failed to load review");
      router.back();
    } finally {
      setLoading(false);
    }
  }, [reviewId, router]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const handleSave = async () => {
    if (!reviewId) return;

    try {
      setSaving(true);
      await databaseService.updateReview(reviewId, {
        comment: caption.trim(),
      });

      router.back();
    } catch (error) {
      reportError("Error updating caption:", error);
      Alert.alert("Error", "Failed to update caption");
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.label}>Edit Caption</Text>
          <TextInput
            style={styles.input}
            multiline
            placeholder="Write a caption..."
            placeholderTextColor={colors.textMuted}
            value={caption}
            onChangeText={setCaption}
            maxLength={500}
            autoFocus
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{caption.length}/500</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => router.back()}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.saveButton,
                saving && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.onAccent} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 17,
    fontFamily: fonts.semibold,
    marginBottom: t.spacing.md,
    color: t.colors.text,
  },
  input: {
    fontFamily: fonts.regular,
    fontSize: 15,
    minHeight: 120,
    padding: t.spacing.md,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.border,
    color: t.colors.text,
  },
  characterCount: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: t.colors.textSecondary,
    textAlign: "right" as const,
    marginTop: t.spacing.sm,
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: "row" as const,
    gap: t.spacing.md,
    marginTop: t.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: t.radius.sm,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cancelButton: {
    backgroundColor: t.colors.surfaceSunken,
  },
  cancelButtonText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: t.colors.text,
  },
  saveButton: {
    backgroundColor: t.colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 15,
    fontFamily: fonts.semibold,
    color: t.colors.onAccent,
  },
}));

export default EditCaption;
