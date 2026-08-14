import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { useForm } from "react-hook-form";
import { useLocalSearchParams, useRouter } from "expo-router";
import LocationInput, {
  type LocationInputValue,
} from "@/components/LocationInput";
import { useProfile } from "@/context/profile-context";
import databaseService from "@/services/databaseService";
import { setPendingFavoriteLocation } from "@/services/favoriteLocationSelection";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";

interface FavoriteLocationForm {
  location: LocationInputValue | null;
}

const FavoriteLocation = () => {
  const styles = useStyles();
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{
    hasFavoriteLocation?: string;
    saveImmediately?: string;
  }>();
  const { profile, refreshProfile } = useProfile();
  const [saving, setSaving] = useState(false);
  const { control } = useForm<FavoriteLocationForm>({
    defaultValues: { location: null },
  });

  const handleSelect = useCallback(
    async (location: LocationInputValue) => {
      if (!profile?.id || saving) return;

      try {
        setSaving(true);
        const locationId = await databaseService.createOrGetLocation(
          {
            name: location.name,
            address: location.address,
            place_id: location.place_id,
            location: `POINT(${location.coordinates.longitude} ${location.coordinates.latitude})`,
          },
          profile.id
        );
        const numericLocationId = Number(locationId);
        if (!Number.isFinite(numericLocationId)) {
          throw new Error("Favorite location ID is invalid");
        }

        const nextFavoriteLocation = {
          id: numericLocationId,
          name: location.name,
          address: location.address,
        };

        if (params.saveImmediately === "1") {
          await databaseService.updateUserProfile(profile.id, {
            favorite_location_id: numericLocationId,
          });
          await refreshProfile();
        } else {
          setPendingFavoriteLocation(nextFavoriteLocation);
        }
        router.back();
      } catch (error) {
        reportError("Error selecting favorite location:", error);
        Alert.alert(
          "Couldn't select location",
          "Please check your connection and try again."
        );
        setSaving(false);
      }
    },
    [params.saveImmediately, profile?.id, refreshProfile, router, saving]
  );

  const handleRemove = async () => {
    if (!profile?.id || saving) return;

    try {
      setSaving(true);
      if (params.saveImmediately === "1") {
        await databaseService.updateUserProfile(profile.id, {
          favorite_location_id: null,
        });
        await refreshProfile();
      } else {
        setPendingFavoriteLocation(null);
      }
      router.back();
    } catch (error) {
      reportError("Error removing favorite location:", error);
      Alert.alert(
        "Couldn't remove location",
        "Please check your connection and try again."
      );
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.content}>
        <LocationInput
          control={control}
          disabled={saving}
          onLocationSelected={handleSelect}
        />

        {params.hasFavoriteLocation === "1" ? (
          <Pressable
            onPress={handleRemove}
            disabled={saving}
            style={({ pressed }) => [
              styles.removeButton,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel="Remove favorite location"
          >
            <Text style={styles.removeText}>Remove favorite location</Text>
          </Pressable>
        ) : null}
      </View>

      {saving ? (
        <View style={styles.savingOverlay} accessibilityRole="progressbar">
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
};

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.isDark ? t.colors.background : t.colors.surface,
  },
  content: {
    flex: 1,
    paddingHorizontal: t.spacing.gutter,
    paddingTop: t.spacing.lg,
  },
  removeButton: {
    minHeight: 44,
    alignSelf: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.lg,
    marginTop: t.spacing.md,
  },
  removeText: {
    ...t.typography.bodyStrong,
    color: t.colors.danger,
  },
  pressed: {
    opacity: 0.65,
  },
  savingOverlay: {
    position: "absolute" as const,
    top: t.spacing.md,
    right: t.spacing.lg,
  },
}));

export default FavoriteLocation;
