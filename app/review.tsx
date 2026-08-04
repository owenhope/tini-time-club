import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Alert,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image as ExpoImage } from "expo-image";
import { useForm, Controller } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGoBack } from "@/hooks/useAppNavigation";
import AppHeader from "@/components/nav/AppHeader";
import CameraComponent from "@/components/CameraComponent";
import LocationInput from "@/components/LocationInput";
import TasteInput from "@/components/TasteInput";
import PresentationInput from "@/components/PresentationInput";
import SelectableOptionsInput from "@/components/SelectableOptionsInput";
import { File } from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as ImageManipulator from "expo-image-manipulator";
import { useProfile } from "@/context/profile-context";
import { AppText } from "@/components/shared";
import { supabase } from "@/utils/supabase";
import databaseService from "@/services/databaseService";
import AnalyticService from "@/services/analyticsService";
import { HIT_SLOP, fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import CelebrationModal from "@/components/CelebrationModal";
import {
  checkRankUp,
  isRegularAt,
  type Achievement,
} from "@/utils/celebrations";

interface ReviewFormLocation {
  name: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  place_id?: string;
  id?: string;
}

interface ReviewFormValues {
  location: ReviewFormLocation | null;
  spirit: string;
  type: string;
  taste: number;
  presentation: number;
  comment: string;
}

export default function App() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [photo, setPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  type Option = { id: number; name: string };

  const [types, setTypes] = useState<Option[]>([]);
  const [spirits, setSpirits] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<{
    achievements: Achievement[];
    reviewCount: number | null;
  } | null>(null);
  const router = useRouter();
  const goBack = useGoBack();
  const params = useLocalSearchParams();
  const { profile } = useProfile();

  const { control, handleSubmit, reset, watch, setValue } =
    useForm<ReviewFormValues>({
      mode: "onChange",
      defaultValues: {
        location: null,
        spirit: "",
        type: "",
        taste: 0,
        presentation: 0,
        comment: "",
      },
      resolver: undefined,
    });
  const insets = useSafeAreaInsets();
  const watchedValues = watch();

  useEffect(() => {
    getTypes();
    getSpirits();
  }, []);

  // Pre-fill location if provided via URL params
  useEffect(() => {
    if (params.locationName && params.locationAddress) {
      setValue("location", {
        name: params.locationName as string,
        address: params.locationAddress as string,
        coordinates:
          params.locationLat && params.locationLon
            ? {
                latitude: parseFloat(params.locationLat as string),
                longitude: parseFloat(params.locationLon as string),
              }
            : undefined,
        place_id: params.locationPlaceId as string | undefined,
      });
    }
  }, [params.locationName, params.locationAddress, setValue]);

  /** Which picker sheet is open, if any. */
  const [picker, setPicker] = useState<"where" | "spirit" | "type" | null>(
    null
  );

  const spiritName =
    spirits.find((s) => String(s.id) === String(watchedValues.spirit))?.name ??
    null;
  const typeName =
    types.find((t) => String(t.id) === String(watchedValues.type))?.name ??
    null;

  // Everything the review needs before it can be posted. The Post control
  // says which piece is missing rather than just sitting there greyed out.
  const missing = !photo
    ? "a photo"
    : !watchedValues.location
      ? "where you drank it"
      : !watchedValues.spirit
        ? "a spirit"
        : !watchedValues.type
          ? "a type"
          : !watchedValues.taste
            ? "a taste score"
            : !watchedValues.presentation
              ? "a presentation score"
              : !watchedValues.comment?.trim()
                ? "a few words"
                : null;

  // Picking closes the sheet — there is nothing else to do in it.
  useEffect(() => {
    if (picker === "spirit" && watchedValues.spirit) setPicker(null);
    if (picker === "type" && watchedValues.type) setPicker(null);
  }, [picker, watchedValues.spirit, watchedValues.type]);

  /** Back to the camera, keeping the flow open — this is Retake. */
  const retake = () => {
    setPhoto(null);
    setIsReviewing(false);
    setIsSubmitting(false);
    setSubmissionMessage("");
    reset();
  };

  const confirmDiscardReview = () => {
    Alert.alert(
      "Discard review?",
      "Your photo and review details will be lost.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => {
            retake();
            goBack();
          },
        },
      ]
    );
  };

  const uploadImage = async (userId: string) => {
    try {
      if (!photo) {
        reportError("No photo to upload");
        return null;
      }

      // Compress the image using expo-image-manipulator
      const manipResult = await ImageManipulator.manipulateAsync(photo, [], {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG,
      });
      const compressedUri = manipResult.uri;

      const randomFileName = `${Math.random()
        .toString(36)
        .substring(2, 15)}.jpg`;
      const filePath = `${userId}/${randomFileName}`;

      const base64 = await new File(compressedUri).base64();

      const fileData = decode(base64);

      const { data, error } = await supabase.storage
        .from("review_images")
        .upload(filePath, fileData, {
          contentType: "image/jpeg",
        });

      if (error || !data) {
        reportError("Error uploading image:", error);
        return null;
      }

      return data.path;
    } catch (error) {
      reportError("Exception while uploading image:", error);
      return null;
    }
  };

  // If these fail the wizard has no options to pick from and the user is stuck
  // mid-flow, having already taken a photo — so surface it and offer a retry.
  const getTypes = async () => {
    try {
      const data = await databaseService.getTypes();
      setTypes(data);
      setOptionsError(null);
    } catch (error) {
      reportError("Error getting types:", error);
      setTypes([]);
      setOptionsError("We couldn't load Martini types.");
    }
  };

  const getSpirits = async () => {
    try {
      const data = await databaseService.getSpirits();
      setSpirits(data);
      setOptionsError(null);
    } catch (error) {
      reportError("Error getting spirits:", error);
      setSpirits([]);
      setOptionsError("We couldn't load spirits.");
    }
  };

  const retryLoadOptions = async () => {
    setOptionsError(null);
    await Promise.all([getTypes(), getSpirits()]);
  };

  const resolveLocationId = async (userId: string) => {
    return databaseService.createOrGetLocation(
      watchedValues.location &&
        typeof watchedValues.location === "object" &&
        "name" in watchedValues.location &&
        "address" in watchedValues.location &&
        "coordinates" in watchedValues.location
        ? {
            name: (watchedValues.location as any).name,
            address: (watchedValues.location as any).address,
            place_id: (watchedValues.location as any).place_id,
            location: `POINT(${
              (watchedValues.location as any).coordinates.longitude
            } ${(watchedValues.location as any).coordinates.latitude})`,
          }
        : null,
      userId
    );
  };

  const createReview = async (
    userId: string,
    imageUrl: string,
    locationId: string | null
  ) => {
    try {
      const newReview = {
        user_id: userId,
        location: locationId,
        spirit: watchedValues.spirit,
        type: watchedValues.type,
        taste: watchedValues.taste,
        presentation: watchedValues.presentation,
        comment: watchedValues.comment?.trim() || "",
        image_url: imageUrl,
        state: 1,
      };

      const result = await databaseService.createReview(newReview);
      return result.id;
    } catch (error) {
      reportError("Error creating review:", error);
      return null;
    }
  };

  const handleUploadAndCreateReview = async () => {
    // Post is disabled without a signed-in member; the guard is here so the
    // upload path can't be entered with a null profile at all.
    if (!profile) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmissionMessage("Uploading image...");
      const imageUrl = await uploadImage(profile.id);
      if (!imageUrl) {
        // submissionMessage only renders while isSubmitting, so a failure needs
        // its own state or the user is dropped back with no explanation.
        setSubmitError("We couldn't upload your photo. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSubmissionMessage("Creating review...");
      let locationId: string | null = null;
      try {
        locationId = await resolveLocationId(profile.id);
      } catch (error) {
        reportError("Error resolving location:", error);
      }

      // Snapshot before the insert so "became a Regular" is detectable.
      const locationName = (watchedValues.location as any)?.name ?? null;
      const wasRegular = await isRegularAt(locationId, profile.id);

      const reviewId = await createReview(profile.id, imageUrl, locationId);
      if (!reviewId) {
        setSubmitError("We couldn't save your review. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSubmissionMessage("Review created successfully!");

      // Track new review event
      AnalyticService.capture("new_review", {
        reviewId,
        locationId: (watchedValues.location as any)?.id,
        locationName,
      });

      // Best-effort achievement detection; failures just skip the party.
      const [rankCheck, isNowRegular] = await Promise.all([
        checkRankUp(profile.id),
        wasRegular
          ? Promise.resolve(false)
          : isRegularAt(locationId, profile.id),
      ]);
      const achievements: Achievement[] = [];
      if (rankCheck.rankUp) {
        achievements.push({ kind: "rank", tier: rankCheck.rankUp });
      }
      if (!wasRegular && isNowRegular && locationId != null && locationName) {
        achievements.push({
          kind: "regular",
          locationId: Number(locationId),
          locationName,
        });
      }

      setIsSubmitting(false);
      setPhoto(null);
      setIsReviewing(false);
      reset();

      if (achievements.length > 0) {
        // Navigation happens when the celebration is dismissed.
        setCelebration({ achievements, reviewCount: rankCheck.newCount });
        return;
      }

      // Return to wherever the review flow was started (feed, a place
      // profile, ...) instead of always landing on the Profile tab.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate(routes.profile());
      }
    } catch (error) {
      reportError("Error submitting review:", error);
      setSubmitError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const dismissCelebration = () => {
    setCelebration(null);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.navigate(routes.profile());
    }
  };

  return (
    <>
      {/* The celebration is a sibling, not a child: the composer's own
          scroll view would clip it. */}
      {celebration && (
        <CelebrationModal
          achievements={celebration.achievements}
          profile={profile}
          reviewCount={celebration.reviewCount}
          onClose={dismissCelebration}
        />
      )}

      {!isReviewing ? (
        <CameraComponent
          onClose={goBack}
          onCapture={(captured) => {
            setPhoto(captured);
            setIsReviewing(true);
            setIsSubmitting(false);
            setSubmissionMessage("");
          }}
        />
      ) : isSubmitting ? (
        <View style={[styles.container, styles.submitting]}>
          <ActivityIndicator size="large" color={colors.accent} />
          <AppText variant="heading" tone="accent" style={styles.submitText}>
            {submissionMessage}
          </AppText>
        </View>
      ) : (
        <View style={styles.container}>
          {/* One page, top to bottom: the photo, where it was, what was in
              it, the two verdicts, and what you have to say. Variant D — the
              composer is presented, so Cancel and Post are text actions in a
              grabber bar rather than a wizard's footer. */}
          <AppHeader
            variant="modal"
            title="New review"
            topInset={insets.top}
            onCancel={confirmDiscardReview}
            action={{
              label: "Post",
              onPress: () => handleSubmit(handleUploadAndCreateReview)(),
              disabled: missing !== null,
            }}
          />

          <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={insets.top + 44}
          >
            <ScrollView
              contentContainerStyle={styles.page}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {(optionsError || submitError) && (
                <View style={styles.inlineError}>
                  <AppText variant="caption" tone="danger">
                    {submitError || optionsError}
                  </AppText>
                  <TouchableOpacity
                    onPress={
                      submitError
                        ? () => setSubmitError(null)
                        : retryLoadOptions
                    }
                  >
                    <AppText
                      variant="caption"
                      tone="danger"
                      style={styles.inlineErrorAction}
                    >
                      {submitError ? "Dismiss" : "Retry"}
                    </AppText>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.photoFrame}>
                {photo ? (
                  <ExpoImage
                    source={{ uri: photo }}
                    style={styles.photo}
                    contentFit="cover"
                  />
                ) : null}
                <TouchableOpacity
                  style={styles.retake}
                  onPress={retake}
                  accessibilityRole="button"
                  accessibilityLabel="Retake the photo"
                >
                  <Ionicons
                    name="camera-outline"
                    size={15}
                    color={colors.textOnImage}
                  />
                  <AppText variant="label" tone="onImage">
                    Retake
                  </AppText>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.row}
                onPress={() => setPicker("where")}
                accessibilityRole="button"
                accessibilityLabel="Choose where this was served"
              >
                <Ionicons name="location" size={19} color={colors.accent} />
                <View style={styles.rowBody}>
                  <AppText variant="eyebrow" tone="muted">
                    Where
                  </AppText>
                  <AppText
                    variant="bodyStrong"
                    tone={watchedValues.location ? "default" : "muted"}
                    numberOfLines={1}
                  >
                    {(watchedValues.location as any)?.name ?? "Pick a bar"}
                  </AppText>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={colors.textMuted}
                />
              </TouchableOpacity>

              <View style={styles.pair}>
                <TouchableOpacity
                  style={styles.pairCard}
                  onPress={() => setPicker("spirit")}
                  accessibilityRole="button"
                  accessibilityLabel="Choose a spirit"
                >
                  <AppText variant="eyebrow" tone="muted">
                    Spirit
                  </AppText>
                  <AppText
                    variant="bodyStrong"
                    tone={spiritName ? "default" : "muted"}
                    numberOfLines={1}
                  >
                    {spiritName ?? "Pick one"}
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.pairCard}
                  onPress={() => setPicker("type")}
                  accessibilityRole="button"
                  accessibilityLabel="Choose a type"
                >
                  <AppText variant="eyebrow" tone="muted">
                    Type
                  </AppText>
                  <AppText
                    variant="bodyStrong"
                    tone={typeName ? "default" : "muted"}
                    numberOfLines={1}
                  >
                    {typeName ?? "Pick one"}
                  </AppText>
                </TouchableOpacity>
              </View>

              <TasteInput control={control} />
              <PresentationInput control={control} />

              <Controller
                control={control}
                name="comment"
                render={({ field: { onChange, value } }) => (
                  <View style={styles.captionCard}>
                    <TextInput
                      style={styles.captionInput}
                      placeholder="Say more about it…"
                      placeholderTextColor={colors.textMuted}
                      value={value}
                      onChangeText={onChange}
                      multiline
                      maxLength={500}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              />

              {missing ? (
                <AppText variant="caption" tone="muted" style={styles.missing}>
                  Still needs {missing}.
                </AppText>
              ) : null}
            </ScrollView>
          </KeyboardAvoidingView>

          {/* The pickers are sheets over the page, so the page never loses
              its place — you come back to the row you tapped. */}
          <Modal
            visible={picker !== null}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setPicker(null)}
          >
            <View style={styles.sheet}>
              <View style={styles.sheetBar}>
                <TouchableOpacity
                  onPress={() => setPicker(null)}
                  hitSlop={HIT_SLOP}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={24} color={colors.text} />
                </TouchableOpacity>
                <AppText variant="heading">
                  {picker === "where"
                    ? "Where was this served?"
                    : picker === "spirit"
                      ? "Which spirit?"
                      : "Which type?"}
                </AppText>
                <View style={styles.sheetBarSpacer} />
              </View>

              <View style={styles.sheetBody}>
                {picker === "where" ? (
                  <LocationInput
                    control={control}
                    onLocationSelected={() => setPicker(null)}
                  />
                ) : picker === "spirit" ? (
                  <SelectableOptionsInput
                    control={control}
                    name="spirit"
                    options={spirits}
                  />
                ) : picker === "type" ? (
                  <SelectableOptionsInput
                    control={control}
                    name="type"
                    options={types}
                  />
                ) : null}
              </View>
            </View>
          </Modal>
        </View>
      )}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  flex: {
    flex: 1,
  },
  submitting: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.lg,
    paddingHorizontal: t.spacing.xxl,
  },
  submitText: {
    textAlign: "center" as const,
  },
  page: {
    paddingHorizontal: t.spacing.gutter,
    paddingBottom: t.spacing.xxxl,
    gap: t.spacing.lg - 2,
  },
  // 16:11 and soft-square, so the composer shows the crop the card will.
  photoFrame: {
    width: "100%" as const,
    aspectRatio: 16 / 11,
    borderRadius: t.radius.card,
    overflow: "hidden" as const,
    backgroundColor: t.colors.imagePlaceholder,
  },
  photo: {
    width: "100%" as const,
    height: "100%" as const,
  },
  retake: {
    position: "absolute" as const,
    right: t.spacing.md,
    bottom: t.spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: 7,
    paddingHorizontal: t.spacing.lg - 2,
    paddingVertical: 9,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.scrimStrong,
  },
  row: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: t.spacing.md - 1,
    padding: t.spacing.lg - 2,
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  pair: {
    flexDirection: "row" as const,
    gap: t.spacing.sm,
  },
  pairCard: {
    flex: 1,
    gap: 3,
    paddingHorizontal: t.spacing.md + 1,
    paddingVertical: t.spacing.md - 1,
    borderRadius: t.radius.thumb,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
  },
  captionCard: {
    borderRadius: t.radius.card,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.surface,
    paddingHorizontal: t.spacing.lg - 1,
    paddingVertical: t.spacing.md + 2,
  },
  captionInput: {
    ...t.typography.body,
    fontSize: 14,
    minHeight: 66,
    color: t.colors.text,
  },
  missing: {
    textAlign: "center" as const,
  },
  inlineError: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.dangerSubtle,
  },
  inlineErrorAction: {
    fontFamily: fonts.bold,
  },
  sheet: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  sheetBar: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
    paddingHorizontal: t.spacing.gutter,
    paddingVertical: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.divider,
  },
  sheetBarSpacer: {
    width: 24,
  },
  sheetBody: {
    flex: 1,
    paddingHorizontal: t.spacing.gutter,
    paddingTop: t.spacing.lg,
  },
}));
