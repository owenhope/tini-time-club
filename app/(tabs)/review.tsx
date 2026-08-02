import React, { createElement, useEffect, useState, useMemo } from "react";
import {
  Keyboard,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  StyleSheet,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import AnimatedReanimated, {
  runOnJS,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useForm, Controller } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import CameraComponent from "@/components/CameraComponent";
import LocationInput from "@/components/LocationInput";
import TasteInput from "@/components/TasteInput";
import PresentationInput from "@/components/PresentationInput";
import SelectableOptionsInput from "@/components/SelectableOptionsInput";
import ReviewItem from "@/components/ReviewItem";
import { File } from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as ImageManipulator from "expo-image-manipulator";
import { useProfile } from "@/context/profile-context";
import { AppText, Button } from "@/components/shared";
import databaseService from "@/services/databaseService";
import AnalyticService from "@/services/analyticsService";
import { fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import CelebrationModal from "@/components/CelebrationModal";
import {
  checkRankUp,
  isRegularAt,
  type Achievement,
} from "@/utils/celebrations";

// ReviewPreview component for showing live preview with caption input
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

const ReviewPreview = ({
  values,
  spirits,
  types,
  photo,
  profile,
  control,
  watch,
  setValue,
  isSubmitting,
  submissionMessage,
}: {
  values: any;
  spirits: any[];
  types: any[];
  photo: string | null;
  profile: any;
  control: any;
  watch: any;
  setValue: any;
  isSubmitting?: boolean;
  submissionMessage?: string;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const [isCaptionFocused, setIsCaptionFocused] = useState(false);
  const [tempCaption, setTempCaption] = useState("");

  // Create a mock review object for the preview - use form values directly
  const mockReview = useMemo(
    () =>
      ({
        id: "preview",
        user_id: profile?.id || "",
        image_url: photo || "",
        comment: isCaptionFocused ? tempCaption : values.comment || "",
        taste: values.taste || 0,
        presentation: values.presentation || 0,
        inserted_at: new Date().toISOString(),
        profile: {
          id: profile?.id || "",
          username: profile?.username || "You",
          avatar_url: profile?.avatar_url || null,
        },
        spirit: spirits.find((s) => s.id === values.spirit) || {
          name: "Unknown",
        },
        type: types.find((t) => t.id === values.type) || { name: "Unknown" },
        location: values.location
          ? {
              id: "preview-location",
              name: values.location.name,
              address: values.location.address,
            }
          : {
              id: "preview-location",
              name: "Unknown Location",
              address: "",
            },
      }) as any,
    [values, spirits, types, photo, profile, isCaptionFocused, tempCaption]
  );

  // Mock handlers for the preview (they won't do anything)
  const mockHandlers = {
    onDelete: () => {},
    onEdit: () => {},
    onShowLikes: () => {},
    onShowComments: () => {},
    onCommentAdded: () => {},
    onCommentDeleted: () => {},
  };

  const scrollViewRef = React.useRef<ScrollView>(null);

  const handleCaptionFocus = () => {
    setIsCaptionFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCaptionBlur = () => {
    setIsCaptionFocused(false);
  };

  const openCaptionInput = () => {
    setTempCaption(values.comment || "");
    setIsCaptionFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Show loading state when submitting
  if (isSubmitting) {
    return (
      <View style={styles.submitLoadingContainer}>
        <ActivityIndicator size="large" color={colors.accent} />
        <AppText
          variant="heading"
          tone="accent"
          style={styles.submitLoadingText}
        >
          {submissionMessage}
        </AppText>
      </View>
    );
  }

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.previewContainer}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {!isCaptionFocused && (
        <View style={styles.previewWrapper}>
          <View style={styles.scaledReviewContainer}>
            <ReviewItem
              review={mockReview}
              canDelete={false}
              previewMode={true}
              {...mockHandlers}
            />
          </View>
        </View>
      )}
      <View style={styles.captionInputContainer}>
        {!isCaptionFocused ? (
          <TouchableOpacity
            style={styles.captionButton}
            onPress={openCaptionInput}
          >
            <AppText variant="bodyStrong" tone="onAccent">
              {values.comment ? "Edit Caption" : "Add Caption"}
            </AppText>
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              style={styles.captionInput}
              multiline={true}
              placeholder="Write a caption... (required)"
              placeholderTextColor={colors.textMuted}
              onChangeText={setTempCaption}
              value={tempCaption}
              maxLength={500}
              autoFocus={true}
            />
            <AppText
              variant="label"
              tone="secondary"
              style={styles.characterCount}
            >
              {tempCaption?.length || 0}/500
            </AppText>
            <Button
              title="Save caption"
              style={styles.saveCaptionButton}
              onPress={() => {
                if (tempCaption && tempCaption.trim().length > 0) {
                  setValue("comment", tempCaption.trim(), {
                    shouldValidate: true,
                  });
                  setIsCaptionFocused(false);
                }
              }}
              disabled={!tempCaption || tempCaption.trim().length === 0}
              disabledReason="Write a caption first — it goes out with the review."
            />
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default function App() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [photo, setPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [step, setStep] = useState(0);
  type Option = { id: number; name: string };

  const [types, setTypes] = useState<Option[]>([]);
  const [spirits, setSpirits] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [celebration, setCelebration] = useState<{
    achievements: Achievement[];
    reviewCount: number | null;
  } | null>(null);
  const opacity = useSharedValue(1);
  const router = useRouter();
  const params = useLocalSearchParams();
  const { profile } = useProfile();

  const { control, handleSubmit, reset, trigger, formState, watch, setValue } =
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

  interface Question {
    title: string;
    key?: "location" | "spirit" | "type" | "taste" | "presentation" | "comment";
    Component: React.ComponentType<any>;
  }

  const questions: Question[] = [
    {
      title: "Where was this served?",
      key: "location",
      Component: LocationInput,
    },
    {
      title: "Which Spirit?",
      key: "spirit",
      Component: () => (
        <SelectableOptionsInput
          control={control}
          name="spirit"
          options={spirits}
        />
      ),
    },
    {
      title: "Which Type?",
      key: "type",
      Component: () => (
        <SelectableOptionsInput control={control} name="type" options={types} />
      ),
    },
    {
      title: "Presentation Rating",
      key: "presentation",
      Component: PresentationInput,
    },
    { title: "Taste Rating", key: "taste", Component: TasteInput },
    {
      title: "Preview",
      Component: (props) => (
        <ReviewPreview
          values={watchedValues}
          spirits={spirits}
          types={types}
          photo={photo}
          profile={profile}
          control={control}
          watch={watch}
          setValue={setValue}
          isSubmitting={isSubmitting}
          submissionMessage={submissionMessage}
          {...props}
        />
      ),
    },
  ];

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  // Reset the component back to the camera view and clear any submission state.
  const cancelCapture = () => {
    setStep(0);
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
        { text: "Discard", style: "destructive", onPress: cancelCapture },
      ]
    );
  };

  const nextStep = async () => {
    // For the preview step (last step), validate comment field
    if (step === questions.length - 1) {
      // Validate that comment is not empty
      const commentValue = watchedValues.comment?.trim();
      if (!commentValue || commentValue.length === 0) {
        // Don't proceed if comment is empty
        return;
      }
      const isValid = await trigger("comment");
      if (!isValid) return;
    } else if (questions[step].key) {
      const isValid = await trigger(questions[step].key as any);
      if (!isValid) return;
    }

    if (step < questions.length - 1) {
      setIsTransitioning(true);
      // Fade out
      opacity.value = withTiming(0, { duration: 400 }, () => {
        runOnJS(setStep)(step + 1);
      });
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setIsTransitioning(true);
      // Fade out
      opacity.value = withTiming(0, { duration: 400 }, () => {
        runOnJS(setStep)(step - 1);
      });
    }
  };

  // Handle fade in when step changes
  useEffect(() => {
    if (isTransitioning) {
      // Small delay to ensure content is rendered
      const timer = setTimeout(() => {
        opacity.value = withTiming(1, { duration: 400 });
        setIsTransitioning(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [step, isTransitioning]);

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

  const handleUploadAndCreateReview = async (formData: any) => {
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
      setStep(0);
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
      {/* The celebration is a sibling, not a child: TouchableWithoutFeedback
          clones its single child with responder props, which a Fragment or
          Modal can't accept. */}
      {celebration && (
        <CelebrationModal
          achievements={celebration.achievements}
          profile={profile}
          reviewCount={celebration.reviewCount}
          onClose={dismissCelebration}
        />
      )}
      <TouchableWithoutFeedback
        style={[styles.container, { paddingTop: insets.top }]}
        onPress={Keyboard.dismiss}
      >
        {!isReviewing ? (
          <CameraComponent
            onCapture={(photo) => {
              setPhoto(photo);
              setIsReviewing(true);
              setIsSubmitting(false);
              setSubmissionMessage("");
            }}
          />
        ) : (
          <View style={styles.container}>
            {/* Header */}
            {!isSubmitting && (
              <View style={styles.header}>
                <AppText
                  variant="title"
                  style={styles.title}
                  accessibilityRole="header"
                >
                  {questions[step].title}
                </AppText>
                {questions[step].title !== "Preview" && (
                  <>
                    {/* Tiny tracked utility type — the system reserves
                        uppercase for exactly this. */}
                    <AppText
                      variant="eyebrow"
                      tone="accent"
                      style={styles.subtitle}
                    >
                      Step {step + 1} of {questions.length - 1}
                    </AppText>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${
                              ((step + 1) / (questions.length - 1)) * 100
                            }%`,
                          },
                        ]}
                      />
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Content */}
            <AnimatedReanimated.View
              style={[
                styles.content,
                questions[step].title === "Preview" && styles.previewContent,
                questions[step].title === "Where was this served?" &&
                  styles.locationContent,
                animatedStyle,
              ]}
            >
              {(optionsError || submitError) && (
                <View style={styles.inlineError}>
                  <AppText
                    variant="caption"
                    tone="danger"
                    style={styles.inlineErrorText}
                  >
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

              {questions[step].Component &&
                createElement(questions[step].Component, {
                  control,
                  ...formState,
                })}
            </AnimatedReanimated.View>

            {/* Footer */}
            {!isSubmitting && (
              <View style={styles.footer}>
                <Animated.View style={styles.navigation}>
                  <View style={styles.navLeft}>
                    {step > 0 && (
                      <Button
                        title="Back"
                        onPress={prevStep}
                        variant="ghost"
                        size="medium"
                        icon="chevron-back"
                        iconPosition="left"
                      />
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.quitButton}
                    onPress={confirmDiscardReview}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel="Discard review"
                  >
                    <View style={styles.quitButtonVisual}>
                      <Ionicons
                        name="trash-outline"
                        size={16}
                        color={colors.danger}
                      />
                    </View>
                  </TouchableOpacity>

                  <View style={styles.navRight}>
                    {step < questions.length - 1 ? (
                      <Button
                        title="Next"
                        onPress={nextStep}
                        variant="primary"
                        size="medium"
                        icon="chevron-forward"
                        iconPosition="right"
                      />
                    ) : (
                      <Button
                        title="Submit"
                        onPress={() => {
                          // Validate comment before submission
                          const commentValue = watchedValues.comment?.trim();
                          if (!commentValue || commentValue.length === 0) {
                            // Show error or prevent submission
                            return;
                          }
                          handleSubmit(handleUploadAndCreateReview)();
                        }}
                        variant="primary"
                        size="medium"
                        disabled={
                          !watchedValues.comment ||
                          watchedValues.comment.trim().length === 0
                        }
                      />
                    )}
                  </View>
                </Animated.View>
              </View>
            )}
          </View>
        )}
      </TouchableWithoutFeedback>
    </>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: t.spacing.xl - 4,
    paddingBottom: t.spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  title: {
    textAlign: "center" as const,
    marginBottom: t.spacing.sm,
  },
  subtitle: {
    textAlign: "center" as const,
    marginBottom: 15,
  },
  inlineError: {
    backgroundColor: t.colors.dangerSubtle,
    borderRadius: t.radius.input,
    paddingVertical: t.spacing.sm + 2,
    paddingHorizontal: 14,
    marginHorizontal: t.spacing.lg,
    marginBottom: t.spacing.md,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "space-between" as const,
    gap: t.spacing.md,
  },
  inlineErrorText: {
    flexShrink: 1,
  },
  inlineErrorAction: {
    fontFamily: fonts.bold,
  },
  progressBar: {
    height: 4,
    backgroundColor: t.colors.border,
    borderRadius: t.radius.pill,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%" as const,
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.pill,
  },
  content: {
    flex: 1,
    paddingHorizontal: t.spacing.xl - 4,
    overflow: "hidden" as const,
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  previewContent: {
    paddingTop: t.spacing.sm + 2, // Minimal padding for preview step
    justifyContent: "center" as const,
    alignItems: "center" as const,
  },
  locationContent: {
    justifyContent: "flex-start" as const,
    alignItems: "stretch" as const,
    paddingTop: t.spacing.xl - 4,
  },
  footer: {
    paddingHorizontal: t.spacing.xl - 4,
    paddingVertical: t.spacing.sm + 2,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    height: 70,
  },
  navigation: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  navLeft: {
    flex: 1,
    alignItems: "flex-start" as const,
  },
  navRight: {
    flex: 1,
    alignItems: "flex-end" as const,
  },
  quitButton: {
    width: 44,
    height: 44,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  quitButtonVisual: {
    width: 28,
    height: 28,
    borderRadius: t.radius.pill,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.dangerSubtle,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.colors.danger,
  },
  previewContainer: {
    flex: 1,
    width: "100%" as const,
  },
  previewWrapper: {
    flex: 1,
    overflow: "hidden" as const,
  },
  scaledReviewContainer: {
    transformOrigin: "top center",
  },
  captionInputContainer: {
    backgroundColor: t.colors.background,
    borderRadius: t.radius.input,
  },
  captionButton: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.xl - 4,
    paddingVertical: t.spacing.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accent,
    minHeight: 50,
  },
  captionInput: {
    ...t.typography.body,
    minHeight: 60,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.input,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: t.colors.border,
    color: t.colors.text,
    textAlignVertical: "top" as const,
  },
  characterCount: {
    textAlign: "right" as const,
    marginTop: t.spacing.xs,
  },
  saveCaptionButton: {
    marginTop: t.spacing.md,
  },
  submitLoadingContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 40,
  },
  submitLoadingText: {
    marginTop: t.spacing.xl - 4,
    textAlign: "center" as const,
  },
}));
