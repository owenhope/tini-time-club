import PickerRow from "@/components/shared/PickerRow";
import { cityLabel } from "@/utils/homeCity";
import React, { useCallback, useState, useEffect, useRef } from "react";
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
  Switch,
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
import { isUsernameAvailable } from "@/services/onboardingService";
import {
  formatUsernameChangeDate,
  getUsernameError,
  nextUsernameChangeAt,
  USERNAME_CHANGE_MONTHS,
} from "@/utils/username";

/** Asks before a rename, since it locks the username for 3 months. */
function confirmRename(from: string, to: string): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      `Change your username to ${to}?`,
      `You can only change your username once every ${USERNAME_CHANGE_MONTHS} months, and links to @${from} will stop working.`,
      [
        { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
        { text: "Change", onPress: () => resolve(true) },
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}

/** Turns the database's rename refusals into the message to show. */
function renameErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const { code, hint, message } = error as {
    code?: string;
    hint?: string;
    message?: string;
  };
  if (hint === "username_change_limit" && message) return message;
  if (code === "23505") return "That username is already taken";
  if (code === "22023") return "Use only letters, numbers, and underscores";
  return null;
}

const EditProfile = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const { profile, refreshProfile } = useProfile();
  const [bio, setBio] = useState("");
  const [username, setUsername] = useState("");
  const [usernameError, setUsernameError] = useState<string | null>(null);
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
  const [isPublic, setIsPublic] = useState(true);

  const initializedProfile = useRef<string | null>(null);
  const loadData = useCallback(async () => {
    if (profile && initializedProfile.current === profile.id) return;
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
        initializedProfile.current = profile.id;
        setBio(profile.bio || "");
        setUsername(profile.username || "");
        setIsPublic(profile.is_public ?? true);

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
              .from("location_ratings")
              .select(
                "id, name, address, is_golden_glass, is_location_verified"
              )
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
    // Route entry is the ownership boundary for this form's initial snapshot.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

    const nextUsername = username.trim();
    const renaming = nextUsername !== profile.username;

    try {
      setSaving(true);

      if (renaming) {
        if (renameLockedUntil) {
          setUsername(profile.username);
          return;
        }
        const validationError = getUsernameError(nextUsername);
        if (validationError) {
          setUsernameError(validationError);
          return;
        }
        if (!(await isUsernameAvailable(nextUsername, profile.id))) {
          setUsernameError("That username is already taken");
          return;
        }
        if (!(await confirmRename(profile.username, nextUsername))) return;
      }

      await databaseService.updateUserProfile(profile.id, {
        ...(renaming ? { username: nextUsername } : null),
        bio: bio.trim(),
        favorite_spirits: selectedSpirits,
        favorite_types: selectedTypes,
        favorite_location_id: favoriteLocation?.id ?? null,
        is_public: isPublic,
      });

      // Refresh profile context
      await refreshProfile();

      router.back();
    } catch (error) {
      const renameError = renaming ? renameErrorMessage(error) : null;
      if (renameError) {
        // Nothing was saved; keep the form open so they can pick another.
        setUsernameError(renameError);
        return;
      }
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

  const renameLockedUntil = nextUsernameChangeAt(profile?.username_changed_at);
  const usernameHelp =
    usernameError ??
    (renameLockedUntil
      ? `You can change your username again on ${formatUsernameChangeDate(renameLockedUntil)}.`
      : `You can change your username once every ${USERNAME_CHANGE_MONTHS} months.`);

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
          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[
                styles.input,
                renameLockedUntil ? styles.inputLocked : null,
                usernameError ? styles.inputInvalid : null,
              ]}
              value={username}
              onChangeText={(value) => {
                setUsername(value);
                setUsernameError(null);
              }}
              editable={!renameLockedUntil && !saving}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username-new"
              textContentType="username"
              maxLength={20}
              placeholder="username"
              placeholderTextColor={colors.textMuted}
              accessibilityLabel="Username"
              accessibilityHint={usernameError ? undefined : usernameHelp}
            />
            <Text
              style={[styles.help, usernameError ? styles.helpError : null]}
              accessibilityLiveRegion={usernameError ? "polite" : "none"}
            >
              {usernameHelp}
            </Text>
          </View>

          <View style={styles.field}>
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
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Home City</Text>
            <PickerRow
              title={profile?.home_city?.name ?? null}
              placeholder="Add home city"
              subtitle={
                profile?.home_city
                  ? [profile.home_city.region, profile.home_city.country]
                      .filter(Boolean)
                      .join(", ")
                  : null
              }
              onPress={() => router.push(routes.homeCity())}
              accessibilityLabel={
                profile?.home_city
                  ? `Change home city, currently ${cityLabel(profile.home_city)}`
                  : "Add home city"
              }
              accessibilityHint="Opens the city chooser"
            />
          </View>

          <View style={styles.field}>
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
          </View>

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

          <View style={styles.privacyRow}>
            <View style={styles.privacyCopy}>
              <Text style={styles.privacyTitle}>Visible to visitors</Text>
              <Text style={styles.privacyBody}>
                Let signed-out visitors discover your profile and published
                reviews. Turning this off keeps them visible to members only.
              </Text>
            </View>
            <Switch
              value={isPublic}
              onValueChange={setIsPublic}
              trackColor={{
                false: colors.disabledSurface,
                true: colors.accentSubtle,
              }}
              thumbColor={isPublic ? colors.accent : colors.textMuted}
              accessibilityLabel="Visible to signed-out visitors"
            />
          </View>

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
    // The floating native tab bar overlays content; without this the
    // Cancel/Save row ends up underneath it.
    paddingBottom: 96,
  },
  content: {
    flex: 1,
    padding: 20,
    // One rhythm between every field; each field spaces its own label.
    gap: t.spacing.xl,
  },
  field: {
    gap: t.spacing.sm,
  },
  privacyRow: {
    minHeight: 72,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.lg,
    padding: t.spacing.lg,
    borderRadius: t.radius.card,
    backgroundColor: t.colors.background,
  },
  privacyCopy: {
    flex: 1,
    gap: t.spacing.xs,
  },
  privacyTitle: {
    ...t.typography.bodyStrong,
    color: t.colors.text,
  },
  privacyBody: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  // Field labels are utility type: the system reserves uppercase tracking
  // for exactly this and keeps sentence case for content.
  label: {
    ...t.typography.eyebrow,
    color: t.colors.textSecondary,
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
  inputLocked: {
    backgroundColor: t.colors.disabledSurface,
    color: t.colors.textSecondary,
  },
  inputInvalid: {
    borderColor: t.colors.danger,
  },
  help: {
    ...t.typography.caption,
    color: t.colors.textSecondary,
  },
  helpError: {
    color: t.colors.danger,
  },
  bioInput: {
    minHeight: 100,
  },
  // A count is a measurement — the system puts those in mono.
  characterCount: {
    ...t.typography.mono,
    color: t.colors.textSecondary,
    textAlign: "right" as const,
  },
  buttonContainer: {
    flexDirection: "row" as const,
    gap: t.spacing.md,
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
