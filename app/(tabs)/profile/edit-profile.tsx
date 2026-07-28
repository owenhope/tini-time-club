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
import { useRouter } from "expo-router";
import { useProfile } from "@/context/profile-context";
import databaseService from "@/services/databaseService";
import MultiSelectInput from "@/components/MultiSelectInput";
import { makeStyles, useTheme } from "@/theme";

const EditProfile = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, refreshProfile } = useProfile();
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [selectedSpirits, setSelectedSpirits] = useState<(number | string)[]>(
    []
  );
  const [selectedTypes, setSelectedTypes] = useState<(number | string)[]>([]);
  const [spirits, setSpirits] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Load spirits and types
      const [spiritsData, typesData] = await Promise.all([
        databaseService.getSpirits(),
        databaseService.getTypes(),
      ]);

      setSpirits(spiritsData);
      setTypes(typesData);

      // Load current profile data
      if (profile) {
        setName(profile.name || "");
        setBio(profile.bio || "");

        // Handle favorite_spirits (could be array or JSON string)
        let favoriteSpirits = [];
        if (profile.favorite_spirits) {
          if (Array.isArray(profile.favorite_spirits)) {
            favoriteSpirits = profile.favorite_spirits;
          } else {
            try {
              favoriteSpirits = JSON.parse(profile.favorite_spirits);
            } catch {
              favoriteSpirits = [];
            }
          }
        }
        setSelectedSpirits(favoriteSpirits);

        // Handle favorite_types (could be array or JSON string)
        let favoriteTypes = [];
        if (profile.favorite_types) {
          if (Array.isArray(profile.favorite_types)) {
            favoriteTypes = profile.favorite_types;
          } else {
            try {
              favoriteTypes = JSON.parse(profile.favorite_types);
            } catch {
              favoriteTypes = [];
            }
          }
        }
        setSelectedTypes(favoriteTypes);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile?.id) return;

    try {
      setSaving(true);
      await databaseService.updateUserProfile(profile.id, {
        name: name.trim(),
        bio: bio.trim(),
        favorite_spirits: selectedSpirits,
        favorite_types: selectedTypes,
      });

      // Refresh profile context
      await refreshProfile();

      router.back();
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile");
    } finally {
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
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={colors.textMuted}
            value={name}
            onChangeText={setName}
            maxLength={50}
            autoCapitalize="words"
          />

          <Text style={styles.label}>Bio</Text>
          <TextInput
            style={[styles.input, styles.bioInput]}
            multiline
            placeholder="Tell us about yourself..."
            placeholderTextColor={colors.textMuted}
            value={bio}
            onChangeText={setBio}
            maxLength={150}
            textAlignVertical="top"
          />
          <Text style={styles.characterCount}>{bio.length}/150</Text>

          <MultiSelectInput
            label="Favorite Spirits"
            options={spirits}
            selectedIds={selectedSpirits}
            onSelectionChange={setSelectedSpirits}
          />

          <MultiSelectInput
            label="Favorite Types"
            options={types}
            selectedIds={selectedTypes}
            onSelectionChange={setSelectedTypes}
          />

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
    fontSize: 16,
    fontWeight: "600" as const,
    marginBottom: t.spacing.sm,
    marginTop: t.spacing.lg,
    color: t.colors.text,
  },
  input: {
    fontSize: 16,
    padding: t.spacing.md,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.border,
    color: t.colors.text,
  },
  bioInput: {
    minHeight: 100,
  },
  characterCount: {
    fontSize: 12,
    color: t.colors.textSecondary,
    textAlign: "right" as const,
    marginTop: t.spacing.xs,
  },
  buttonContainer: {
    flexDirection: "row" as const,
    gap: t.spacing.md,
    marginTop: t.spacing.xl,
    marginBottom: 20,
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

export default EditProfile;
