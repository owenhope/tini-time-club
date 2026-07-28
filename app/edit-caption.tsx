import React, { useState, useEffect } from "react";
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
import { ProfileProvider, useProfile } from "@/context/profile-context";
import databaseService from "@/services/databaseService";
import { supabase } from "@/utils/supabase";
import { Review } from "@/types/types";
import imageCache from "@/utils/imageCache";
import { makeStyles, useTheme } from "@/theme";

const EditCaption = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ reviewId: string }>();
  const { profile } = useProfile();
  const [review, setReview] = useState<Review | null>(null);
  const [caption, setCaption] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadReview();
  }, [params.reviewId]);

  const loadReview = async () => {
    if (!params.reviewId) {
      Alert.alert("Error", "Review ID is missing");
      router.back();
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("reviews")
        .select(
          `
          id,
          comment,
          image_url,
          inserted_at,
          taste,
          presentation,
          user_id,
          location:locations!reviews_location_fkey(id, name, address),
          spirit:spirit(name),
          type:type(name),
          profile:profiles!user_id(id, username, avatar_url, is_verified)
        `
        )
        .eq("id", params.reviewId)
        .eq("state", 1)
        .single();

      if (error) throw error;

      // Verify this is the user's own review
      if (data.user_id !== profile?.id) {
        Alert.alert("Error", "You can only edit your own reviews");
        router.back();
        return;
      }

      // Get image URL
      const imageUrls = await imageCache.getReviewImageUrls([data.image_url]);
      const reviewWithImage = {
        ...data,
        image_url: imageUrls[data.image_url] || data.image_url,
      };

      setReview(reviewWithImage as unknown as Review);
      setCaption(data.comment || "");
    } catch (error) {
      console.error("Error loading review:", error);
      Alert.alert("Error", "Failed to load review");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!params.reviewId) return;

    try {
      setSaving(true);
      await databaseService.updateReview(params.reviewId, {
        comment: caption.trim(),
      });

      router.back();
    } catch (error) {
      console.error("Error updating caption:", error);
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
    fontSize: 18,
    fontWeight: "600" as const,
    marginBottom: t.spacing.md,
    color: t.colors.text,
  },
  input: {
    fontSize: 16,
    minHeight: 120,
    padding: t.spacing.md,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.border,
    color: t.colors.text,
  },
  characterCount: {
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
    fontSize: 16,
    fontWeight: "600" as const,
    color: t.colors.text,
  },
  saveButton: {
    backgroundColor: t.colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: t.colors.onAccent,
  },
}));

// This screen lives in the root stack, outside the tabs layout that mounts
// ProfileProvider, so it brings its own (served from the auth cache).
const EditCaptionScreen = () => (
  <ProfileProvider>
    <EditCaption />
  </ProfileProvider>
);

export default EditCaptionScreen;
