import "react-native-get-random-values";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { File } from "expo-file-system";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import { Filter } from "bad-words";
import { v4 as uuidv4 } from "uuid";
import { AppText, Avatar, Button, Input } from "@/components/shared";
import AppHeader from "@/components/nav/AppHeader";
import MultiSelectInput from "@/components/MultiSelectInput";
import FavoriteLocationPicker from "@/components/FavoriteLocationPicker";
import { parseFavoriteIds } from "@/components/profile/FavoriteTags";
import { useProfile } from "@/context/profile-context";
import databaseService from "@/services/databaseService";
import {
  consumePendingFavoriteLocation,
  type FavoriteLocationValue,
} from "@/services/favoriteLocationSelection";
import {
  clearOnboardingDraft,
  getOnboardingDraft,
  saveOnboardingDraft,
} from "@/services/onboardingDraftService";
import { unregisterPushNotificationsAsync } from "@/services/pushNotificationService";
import { clearUserCaches } from "@/utils/signOut";
import { supabase } from "@/utils/supabase";
import { routes } from "@/utils/routes";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { RANK_TIERS } from "@/utils/ranking";
import type { NamedOption } from "@/types/types";

type OnboardingStep = 1 | 2 | 3;
type UsernameStatus =
  "idle" | "checking" | "available" | "unavailable" | "error";

const fetchFavoriteOptions = () =>
  Promise.all([databaseService.getSpirits(), databaseService.getTypes()]);

const usernameFilter = new Filter();

const getUsernameError = (username: string) => {
  if (username.length < 3) return "Username must be at least 3 characters";
  if (username.length > 20) return "Username must be 20 characters or less";
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return "Use only letters, numbers, and underscores";
  }
  if (usernameFilter.isProfane(username)) {
    return "Please choose a different username";
  }
  return null;
};

export default function Onboarding() {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { profile, loading, updateProfile, acceptEULA } = useProfile();
  const initializedProfileId = useRef<string | null>(null);
  const [step, setStep] = useState<OnboardingStep>(1);
  const [username, setUsername] = useState("");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [selectedSpirits, setSelectedSpirits] = useState<(number | string)[]>(
    []
  );
  const [selectedTypes, setSelectedTypes] = useState<(number | string)[]>([]);
  const [spirits, setSpirits] = useState<NamedOption[]>([]);
  const [types, setTypes] = useState<NamedOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [favoriteLocation, setFavoriteLocation] =
    useState<FavoriteLocationValue | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [saving, setSaving] = useState(false);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const termsViewportHeight = useRef(0);
  const termsContentHeight = useRef(0);

  useEffect(() => {
    if (!profile || initializedProfileId.current === profile.id) return;
    initializedProfileId.current = profile.id;
    const draft = getOnboardingDraft(profile.id);
    setUsername(draft?.username ?? profile.username ?? "");
    setAvatarUri(draft?.avatarUri ?? null);
    setSelectedSpirits(
      draft?.selectedSpirits ?? parseFavoriteIds(profile.favorite_spirits)
    );
    setSelectedTypes(
      draft?.selectedTypes ?? parseFavoriteIds(profile.favorite_types)
    );
    setFavoriteLocation(draft?.favoriteLocation ?? null);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      const pendingFavoriteLocation = consumePendingFavoriteLocation();
      if (pendingFavoriteLocation !== undefined) {
        setFavoriteLocation(pendingFavoriteLocation);
        if (profile) {
          const draft = getOnboardingDraft(profile.id);
          if (draft) {
            saveOnboardingDraft({
              ...draft,
              favoriteLocation: pendingFavoriteLocation,
            });
          }
        }
      }
    }, [profile])
  );

  const loadFavoriteOptions = useCallback(async () => {
    setOptionsLoading(true);
    setOptionsError(null);
    try {
      const [spiritOptions, typeOptions] = await fetchFavoriteOptions();
      setSpirits(spiritOptions);
      setTypes(typeOptions);
    } catch (error) {
      reportError("Error loading onboarding favorites:", error);
      setOptionsError("We couldn't load the favorites yet.");
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetchFavoriteOptions()
      .then(([spiritOptions, typeOptions]) => {
        if (!active) return;
        setSpirits(spiritOptions);
        setTypes(typeOptions);
      })
      .catch((error) => {
        if (!active) return;
        reportError("Error loading onboarding favorites:", error);
        setOptionsError("We couldn't load the favorites yet.");
      })
      .finally(() => {
        if (active) setOptionsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (profile?.username && profile.eula_accepted) {
      router.replace(routes.home());
    }
  }, [profile?.eula_accepted, profile?.username, router]);

  const checkUsernameAvailability = useCallback(
    async (candidate: string) => {
      if (!profile) return false;
      const { data: matchingProfiles, error: availabilityError } =
        await supabase
          .from("profiles")
          .select("id")
          .ilike("username", candidate)
          .eq("deleted", false)
          .neq("id", profile.id)
          .limit(1);

      if (availabilityError) throw availabilityError;
      return !matchingProfiles?.length;
    },
    [profile]
  );

  useEffect(() => {
    const candidate = username.trim();
    if (!profile || getUsernameError(candidate)) return;

    let active = true;
    const timeout = setTimeout(() => {
      setUsernameStatus("checking");
      void checkUsernameAvailability(candidate)
        .then((available) => {
          if (!active) return;
          if (available) {
            setUsernameError(null);
            setUsernameStatus("available");
          } else {
            setUsernameError("That username is already taken");
            setUsernameStatus("unavailable");
          }
        })
        .catch((error) => {
          if (!active) return;
          reportError("Error checking onboarding username:", error);
          setUsernameError("Couldn't verify that username. Please try again.");
          setUsernameStatus("error");
        });
    }, 450);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [checkUsernameAvailability, profile, username]);

  const usernameIsAvailable = useCallback(async () => {
    const candidate = username.trim();
    const validationError = getUsernameError(candidate);
    if (validationError) {
      setUsernameError(validationError);
      setUsernameStatus("idle");
      return false;
    }

    setUsernameStatus("checking");
    try {
      const available = await checkUsernameAvailability(candidate);
      if (available) {
        setUsernameError(null);
        setUsernameStatus("available");
      } else {
        setUsernameError("That username is already taken");
        setUsernameStatus("unavailable");
      }
      return available;
    } catch (error) {
      setUsernameError("Couldn't verify that username. Please try again.");
      setUsernameStatus("error");
      throw error;
    }
  }, [checkUsernameAvailability, username]);

  const pickAvatar = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });
      if (!result.canceled) setAvatarUri(result.assets[0].uri);
    } catch (error) {
      reportError("Error choosing onboarding avatar:", error);
      Alert.alert("Photo unavailable", "Please try choosing your photo again.");
    }
  }, []);

  const uploadAvatar = useCallback(async () => {
    if (!avatarUri || !profile) return null;

    const manipResult = await ImageManipulator.manipulateAsync(
      avatarUri,
      [{ resize: { width: 512 } }],
      { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
    );
    const filePath = `${profile.id}/avatar_${uuidv4()}.jpg`;
    const base64 = await new File(manipResult.uri).base64();
    const { error } = await supabase.storage
      .from("avatars")
      .upload(filePath, decode(base64), { contentType: "image/jpeg" });

    if (error) throw error;
    return filePath;
  }, [avatarUri, profile]);

  const saveProfile = useCallback(async () => {
    if (!profile || saving || usernameStatus !== "available") return;

    let uploadedAvatarPath: string | null = null;
    setSaving(true);
    try {
      if (!(await usernameIsAvailable())) {
        return;
      }

      uploadedAvatarPath = await uploadAvatar();
      const result = await updateProfile({
        username: username.trim(),
        favorite_spirits: selectedSpirits,
        favorite_types: selectedTypes,
        favorite_location_id:
          favoriteLocation?.id ?? profile.favorite_location_id ?? null,
        ...(uploadedAvatarPath
          ? { avatar_url: uploadedAvatarPath }
          : undefined),
      });
      if (result.error) throw result.error;
      clearOnboardingDraft(profile.id);

      if (
        uploadedAvatarPath &&
        profile.avatar_url &&
        profile.avatar_url !== uploadedAvatarPath
      ) {
        const { error: removeError } = await supabase.storage
          .from("avatars")
          .remove([profile.avatar_url]);
        if (removeError) {
          reportError(
            "Error removing previous onboarding avatar:",
            removeError
          );
        }
      }

      if (profile.eula_accepted) {
        router.replace(routes.home());
      } else {
        setStep(2);
      }
    } catch (error) {
      if (uploadedAvatarPath) {
        const { error: cleanupError } = await supabase.storage
          .from("avatars")
          .remove([uploadedAvatarPath]);
        if (cleanupError) {
          reportError("Error cleaning up onboarding avatar:", cleanupError);
        }
      }
      reportError("Error saving onboarding profile:", error);
      Alert.alert(
        "Profile unavailable",
        "Please try saving your profile again."
      );
    } finally {
      setSaving(false);
    }
  }, [
    favoriteLocation,
    profile,
    router,
    saving,
    selectedSpirits,
    selectedTypes,
    uploadAvatar,
    updateProfile,
    username,
    usernameIsAvailable,
    usernameStatus,
  ]);

  const acceptTerms = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const result = await acceptEULA();
      if (result.error) throw result.error;
      if (profile) clearOnboardingDraft(profile.id);
      router.replace(routes.home());
    } catch (error) {
      reportError("Error accepting onboarding EULA:", error);
      Alert.alert("Terms unavailable", "Please try accepting the terms again.");
    } finally {
      setSaving(false);
    }
  }, [acceptEULA, profile, router, saving]);

  const declineTerms = useCallback(async () => {
    if (profile) clearOnboardingDraft(profile.id);
    await unregisterPushNotificationsAsync();
    await clearUserCaches();
    await supabase.auth.signOut();
  }, [profile]);

  const confirmDeclineTerms = useCallback(() => {
    if (saving) return;
    Alert.alert(
      "Terms Required",
      "You must accept the terms and conditions to use Tini Time Club. Would you like to read them again?",
      [
        { text: "Read Again", style: "cancel" },
        {
          text: "Exit App",
          style: "destructive",
          onPress: () => void declineTerms(),
        },
      ]
    );
  }, [declineTerms, saving]);

  const markTermsReadIfContentFits = useCallback(() => {
    if (
      termsViewportHeight.current > 0 &&
      termsContentHeight.current > 0 &&
      termsContentHeight.current <= termsViewportHeight.current
    ) {
      setHasReadTerms(true);
    }
  }, []);

  const handleTermsLayout = useCallback(
    (event: LayoutChangeEvent) => {
      termsViewportHeight.current = event.nativeEvent.layout.height;
      markTermsReadIfContentFits();
    },
    [markTermsReadIfContentFits]
  );

  const handleTermsContentSizeChange = useCallback(
    (_width: number, height: number) => {
      termsContentHeight.current = height;
      markTermsReadIfContentFits();
    },
    [markTermsReadIfContentFits]
  );

  const handleTermsScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const { layoutMeasurement, contentOffset, contentSize } =
        event.nativeEvent;
      if (
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - 20
      ) {
        setHasReadTerms(true);
      }
    },
    []
  );

  const openFavoriteLocation = useCallback(() => {
    if (!profile) return;
    saveOnboardingDraft({
      profileId: profile.id,
      username,
      avatarUri,
      selectedSpirits,
      selectedTypes,
      favoriteLocation,
    });
    router.push(
      routes.favoriteLocation({
        hasFavoriteLocation: favoriteLocation ? "1" : "0",
      })
    );
  }, [
    avatarUri,
    favoriteLocation,
    profile,
    router,
    selectedSpirits,
    selectedTypes,
    username,
  ]);

  if (loading || !profile) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  const trimmedUsername = username.trim();
  const localUsernameError = trimmedUsername
    ? getUsernameError(trimmedUsername)
    : null;
  const displayedUsernameError = localUsernameError ?? usernameError;
  const usernameReady = !localUsernameError && usernameStatus === "available";

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {step === 1 ? (
          <View style={styles.profileFlow}>
            <AppHeader variant="large" title="Create your profile" />

            <View style={styles.profileContent}>
              <ScrollView
                contentContainerStyle={styles.questionContent}
                keyboardShouldPersistTaps="handled"
                contentInsetAdjustmentBehavior="automatic"
              >
                <View style={styles.avatarStep}>
                  <Pressable
                    onPress={pickAvatar}
                    style={({ pressed }) => [
                      styles.avatarPicker,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={
                      avatarUri
                        ? "Change profile photo"
                        : "Choose profile photo"
                    }
                  >
                    {avatarUri ? (
                      <Image
                        source={{ uri: avatarUri }}
                        style={styles.avatarPreview}
                        contentFit="cover"
                      />
                    ) : (
                      <Avatar
                        username={username.trim()}
                        fallbackText="TT"
                        size={104}
                        showRing={false}
                      />
                    )}
                    <View style={styles.avatarBadge}>
                      <Ionicons
                        name="camera"
                        size={18}
                        color={colors.onAccent}
                      />
                    </View>
                  </Pressable>
                  <View style={styles.avatarActions}>
                    <AppText variant="bodyStrong">Profile photo</AppText>
                  </View>
                </View>

                <Input
                  label="Username"
                  value={username}
                  onChangeText={(value) => {
                    setUsername(value);
                    setUsernameError(null);
                    setUsernameStatus("idle");
                  }}
                  placeholder="Unique username"
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  error={displayedUsernameError ?? undefined}
                  supportingText={
                    usernameStatus === "checking"
                      ? "Checking availability..."
                      : usernameStatus === "available"
                        ? "Username available"
                        : undefined
                  }
                  supportingTone={
                    usernameStatus === "available" ? "success" : "secondary"
                  }
                  supportingIcon={
                    usernameStatus === "available"
                      ? "checkmark-circle"
                      : undefined
                  }
                  reserveErrorSpace
                  size="medium"
                  style={styles.profileInput}
                  containerStyle={styles.usernameInputContainer}
                />

                {optionsLoading ? (
                  <View style={styles.optionsLoading}>
                    <ActivityIndicator color={colors.accent} />
                  </View>
                ) : optionsError ? (
                  <View style={styles.optionsError}>
                    <AppText variant="caption" tone="danger">
                      {optionsError}
                    </AppText>
                    <Button
                      title="Retry"
                      onPress={loadFavoriteOptions}
                      variant="outline"
                      size="small"
                    />
                  </View>
                ) : (
                  <>
                    <MultiSelectInput
                      label="Favorite Type"
                      options={types}
                      selectedIds={selectedTypes}
                      onSelectionChange={setSelectedTypes}
                      maxSelections={1}
                    />
                    <MultiSelectInput
                      label="Favorite Spirit"
                      options={spirits}
                      selectedIds={selectedSpirits}
                      onSelectionChange={setSelectedSpirits}
                      maxSelections={1}
                    />
                  </>
                )}

                <AppText variant="eyebrow" tone="secondary">
                  Favorite location
                </AppText>
                <FavoriteLocationPicker
                  value={favoriteLocation}
                  onPress={openFavoriteLocation}
                />
              </ScrollView>
            </View>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: Math.max(insets.bottom, 10) + 6,
                  minHeight: 70 + Math.max(insets.bottom, 10),
                },
              ]}
            >
              <View style={styles.navigation}>
                <Button
                  title={profile.eula_accepted ? "Finish" : "Create profile"}
                  onPress={saveProfile}
                  icon="chevron-forward"
                  iconPosition="right"
                  size="medium"
                  loading={saving}
                  disabled={saving || !usernameReady}
                />
              </View>
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View style={styles.profileFlow}>
            <AppHeader variant="large" title="Rings & Regulars" />

            <ScrollView
              contentContainerStyle={styles.educationContent}
              contentInsetAdjustmentBehavior="automatic"
            >
              <View style={styles.educationIntro}>
                <AppText variant="heading">
                  Every review builds your standing.
                </AppText>
                <AppText variant="body" tone="secondary">
                  Your ring shows your rank across the club, while Regular
                  status is earned one location at a time.
                </AppText>
              </View>

              <View style={styles.educationSection}>
                <AppText variant="eyebrow" tone="secondary">
                  Rings & rankings
                </AppText>
                <AppText variant="body" tone="secondary">
                  Your avatar ring levels up as your active review count grows.
                </AppText>
                <View style={styles.rankRow}>
                  {RANK_TIERS.map((tier) => (
                    <View key={tier.key} style={styles.rankItem}>
                      <Avatar
                        avatarPath={profile.avatar_url}
                        username={profile.username ?? username.trim()}
                        fallbackText="TT"
                        size={48}
                        reviewCount={tier.min}
                      />
                      <AppText variant="label" style={styles.rankName}>
                        {tier.name}
                      </AppText>
                      <AppText variant="caption" tone="secondary">
                        {tier.min}+
                      </AppText>
                    </View>
                  ))}
                </View>
              </View>

              <View style={styles.educationSection}>
                <AppText variant="eyebrow" tone="secondary">
                  Regulars
                </AppText>
                <View style={styles.regularsExplanation}>
                  <View style={styles.regularsIcon}>
                    <Ionicons name="people" size={28} color={colors.onAccent} />
                  </View>
                  <AppText
                    variant="body"
                    tone="secondary"
                    style={styles.regularsCopy}
                  >
                    The three members with the most active reviews at a location
                    are its Regulars. Keep reviewing there to earn and hold your
                    seat.
                  </AppText>
                </View>
              </View>
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: Math.max(insets.bottom, 10) + 6,
                  minHeight: 70 + Math.max(insets.bottom, 10),
                },
              ]}
            >
              <View style={styles.navigation}>
                <Button
                  title="Review terms"
                  onPress={() => setStep(3)}
                  icon="chevron-forward"
                  iconPosition="right"
                  size="medium"
                />
              </View>
            </View>
          </View>
        ) : null}

        {step === 3 ? (
          <View style={styles.profileFlow}>
            <AppHeader variant="large" title="Terms & Guidelines" />

            <ScrollView
              style={styles.termsScroll}
              contentContainerStyle={styles.termsContent}
              onScroll={handleTermsScroll}
              onLayout={handleTermsLayout}
              onContentSizeChange={handleTermsContentSizeChange}
              scrollEventThrottle={16}
              showsVerticalScrollIndicator
              contentInsetAdjustmentBehavior="automatic"
            >
              <AppText variant="heading">Welcome to Tini Time Club</AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                By using Tini Time Club, you agree to these terms and our
                community guidelines. Please read them carefully.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                1. User-Generated Content
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                Tini Time Club allows users to share reviews, photos, and
                comments about cocktails and venues. You are responsible for all
                content you post.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                2. Content License
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                You retain ownership of your reviews, photos, comments, and
                other content. By submitting content to Tini Time Club, you
                grant Tini Time Club a worldwide, non-exclusive, royalty-free,
                transferable, and sublicensable license to host, store, use,
                reproduce, modify, adapt, publish, display, distribute, and
                create derivative works from that content in any media for
                providing app functionality, operating, maintaining, improving,
                promoting, and marketing Tini Time Club, without compensation to
                you. You represent that you have all rights needed to grant this
                license.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                3. Zero Tolerance Policy
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                We have a ZERO TOLERANCE policy for: harassment, bullying, or
                threatening behavior; hate speech, discrimination, or offensive
                language; inappropriate, explicit, or adult content; spam, fake
                reviews, or misleading information; copyright infringement or
                stolen content; and any content that violates local laws.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                4. Content Moderation
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                We actively monitor and moderate all user-generated content.
                Violations will result in immediate content removal and may lead
                to account suspension or termination.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                5. Reporting System
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                If you see inappropriate content or behavior, please report it
                immediately using our in-app reporting feature. We take all
                reports seriously and investigate promptly.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                6. Account Responsibility
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                You are responsible for maintaining the security of your account
                and for all activities that occur under your account. Do not
                share your account credentials with others.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                7. Privacy & Data
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                We respect your privacy and handle your data according to our
                Privacy Policy. By using the app, you consent to our data
                practices as described in our Privacy Policy.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                8. Age Requirements
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                You must be at least 21 years old to use Tini Time Club. We do
                not knowingly collect information from users under 21.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                9. Prohibited Activities
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                You may not create fake accounts or impersonate others; post
                reviews for venues you haven&apos;t visited; use the app for
                commercial purposes without permission; attempt to hack,
                disrupt, or damage the app; or violate any applicable laws or
                regulations.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                10. Enforcement
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                We reserve the right to remove content, suspend accounts, or
                take other appropriate action against users who violate these
                terms. Decisions are final and at our sole discretion.
              </AppText>

              <AppText variant="bodyStrong" style={styles.termsSectionTitle}>
                11. Changes to Terms
              </AppText>
              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsText}
              >
                We may update these terms from time to time. Continued use of
                the app after changes constitutes acceptance of the new terms.
              </AppText>

              <AppText
                variant="caption"
                tone="secondary"
                style={styles.termsAcknowledgement}
              >
                By accepting these terms, you acknowledge that you have read,
                understood, and agree to be bound by them.
              </AppText>
            </ScrollView>

            <View
              style={[
                styles.footer,
                {
                  paddingBottom: Math.max(insets.bottom, 10) + 6,
                  minHeight: 70 + Math.max(insets.bottom, 10),
                },
              ]}
            >
              <View style={styles.termsNavigation}>
                <Button
                  title="Decline"
                  onPress={confirmDeclineTerms}
                  variant="ghost"
                  size="medium"
                  disabled={saving}
                />
                <Button
                  title="I Agree"
                  onPress={acceptTerms}
                  size="medium"
                  loading={saving}
                  disabled={!hasReadTerms || saving}
                />
              </View>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  loading: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.background,
  },
  profileFlow: {
    flex: 1,
  },
  stepHeaderMeta: {
    gap: t.spacing.sm,
  },
  subtitle: {
    color: t.colors.highlight,
  },
  progressBar: {
    height: 4,
    backgroundColor: t.colors.ratingTrackOnInk,
    borderRadius: t.radius.pill,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%" as const,
    backgroundColor: t.colors.highlight,
    borderRadius: t.radius.pill,
  },
  profileContent: {
    flex: 1,
    overflow: "hidden" as const,
  },
  questionContent: {
    flexGrow: 1,
    paddingHorizontal: t.spacing.xl - 4,
    paddingTop: t.spacing.xl - 4,
    paddingBottom: t.spacing.xl,
    gap: t.spacing.md,
  },
  educationContent: {
    flexGrow: 1,
    paddingHorizontal: t.spacing.xl - 4,
    paddingTop: t.spacing.xl,
    paddingBottom: t.spacing.xl,
    gap: t.spacing.xxl,
  },
  educationIntro: {
    gap: t.spacing.sm,
  },
  educationSection: {
    gap: t.spacing.md,
  },
  rankRow: {
    minHeight: 100,
    flexDirection: "row" as const,
    alignItems: "flex-start" as const,
    justifyContent: "space-between" as const,
    paddingTop: t.spacing.sm,
  },
  rankItem: {
    width: 72,
    alignItems: "center" as const,
    gap: t.spacing.xs,
  },
  rankName: {
    color: t.colors.text,
    textAlign: "center" as const,
  },
  regularsExplanation: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
  },
  regularsIcon: {
    width: 56,
    height: 56,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accent,
  },
  regularsCopy: {
    flex: 1,
  },
  termsScroll: {
    flex: 1,
  },
  termsContent: {
    paddingHorizontal: t.spacing.xl - 4,
    paddingTop: t.spacing.xl,
    paddingBottom: t.spacing.xxl,
  },
  termsSectionTitle: {
    marginTop: t.spacing.lg,
    marginBottom: t.spacing.sm,
  },
  termsText: {
    lineHeight: 20,
  },
  termsAcknowledgement: {
    lineHeight: 20,
    fontStyle: "italic" as const,
    textAlign: "center" as const,
    marginTop: t.spacing.xl,
  },
  termsNavigation: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    alignItems: "center" as const,
    gap: t.spacing.sm,
  },
  avatarStep: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md,
    paddingVertical: t.spacing.sm,
  },
  avatarPicker: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 2,
    borderColor: t.colors.border,
  },
  avatarPreview: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarBadge: {
    position: "absolute" as const,
    right: 4,
    bottom: 8,
    width: 34,
    height: 34,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.accent,
    borderWidth: 3,
    borderColor: t.colors.background,
  },
  avatarActions: {
    flex: 1,
    gap: t.spacing.xs,
  },
  pressed: {
    opacity: 0.65,
  },
  profileInput: {
    borderRadius: t.radius.input,
    backgroundColor: t.colors.background,
  },
  usernameInputContainer: {
    marginBottom: 0,
  },
  optionsLoading: {
    minHeight: 180,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  optionsError: {
    minHeight: 180,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.md,
  },
  footer: {
    paddingHorizontal: t.spacing.xl - 4,
    paddingTop: t.spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    justifyContent: "center" as const,
  },
  navigation: {
    flexDirection: "row" as const,
    justifyContent: "flex-end" as const,
    alignItems: "center" as const,
  },
}));
