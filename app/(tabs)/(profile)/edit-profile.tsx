import React, { useCallback, useState, useEffect } from "react";
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
import { useFocusEffect, useRouter } from "expo-router";
import { useProfile } from "@/context/profile-context";
import databaseService from "@/services/databaseService";
import { isAccountGoneError } from "@/utils/accountErrors";
import MultiSelectInput from "@/components/MultiSelectInput";
import FavoriteLocationPicker from "@/components/FavoriteLocationPicker";
import {
  consumePendingFavoriteLocation,
  type FavoriteLocationValue,
} from "@/services/favoriteLocationSelection";
import { supabase } from "@/utils/supabase";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";

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
  const [favoriteLocation, setFavoriteLocation] =
    useState<FavoriteLocationValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
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

        if (profile.favorite_location_id) {
          const { data: favoriteLocationData, error: favoriteLocationError } =
            await supabase
              .from("locations")
              .select("id, name, address")
              .eq("id", profile.favorite_location_id)
              .maybeSingle();

          if (favoriteLocationError) {
            reportError(
              "Error loading favorite location:",
              favoriteLocationError
            );
          } else {
            setFavoriteLocation(favoriteLocationData);
          }
        }
      }
    } catch (error) {
      reportError("Error loading data:", error);
      Alert.alert("Error", "Failed to load profile data");
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      const pendingFavoriteLocation = consumePendingFavoriteLocation();
      if (pendingFavoriteLocation !== undefined) {
        setFavoriteLocation(pendingFavoriteLocation);
      }
    }, [])
  );

  const handleSave = async () => {
    if (!profile?.id) return;

    try {
      setSaving(true);
      await databaseService.updateUserProfile(profile.id, {
        name: name.trim(),
        bio: bio.trim(),
        favorite_spirits: selectedSpirits,
        favorite_types: selectedTypes,
        favorite_location_id: favoriteLocation?.id ?? null,
      });

      // Refresh profile context
      await refreshProfile();

      router.back();
    } catch (error) {
      reportError("Error updating profile:", error);
      if (isAccountGoneError(error)) {
        // refreshProfile() -> the context signs out and explains; don't stack
        // a second, misleading alert on top of it.
        await refreshProfile();
        return;
      }
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
            label="Favorite Spirit"
            options={spirits}
            selectedIds={selectedSpirits}
            onSelectionChange={setSelectedSpirits}
            maxSelections={1}
          />

          <MultiSelectInput
            label="Favorite Type"
            options={types}
            selectedIds={selectedTypes}
            onSelectionChange={setSelectedTypes}
            maxSelections={1}
          />

          <Text style={styles.label}>Favorite Location</Text>
          <FavoriteLocationPicker
            value={favoriteLocation}
            onPress={() =>
              router.push(
                routes.favoriteLocation({
                  hasFavoriteLocation: favoriteLocation ? "1" : "0",
                })
              )
            }
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
  // Field labels are utility type: the system reserves uppercase tracking
  // for exactly this and keeps sentence case for content.
  label: {
    ...t.typography.eyebrow,
    color: t.colors.textSecondary,
    marginBottom: t.spacing.sm,
    marginTop: t.spacing.lg,
  },
  input: {
    ...t.typography.input,
    padding: t.spacing.md,
    borderRadius: t.radius.input,
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.border,
    color: t.colors.inputText,
  },
  bioInput: {
    minHeight: 100,
  },
  // A count is a measurement — the system puts those in mono.
  characterCount: {
    ...t.typography.mono,
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
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  cancelButton: {
    backgroundColor: t.colors.surfaceSunken,
  },
  cancelButtonText: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  saveButton: {
    backgroundColor: t.colors.accent,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    ...t.typography.bodyStrong,
    color: t.colors.onAccent,
  },
}));

export default EditProfile;
