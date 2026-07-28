import React, { createElement, useEffect, useState, useMemo } from "react";
import {
  Keyboard,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  Animated,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import { isDevelopmentMode } from "@/utils/helpers";
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
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as ImageManipulator from "expo-image-manipulator";
import { useProfile } from "@/context/profile-context";
import { NOTIFICATION_TYPES } from "@/utils/consts";
import { Button } from "@/components/shared";
import databaseService from "@/services/databaseService";
import { TextInput } from "react-native";
import AnalyticService from "@/services/analyticsService";
import { makeStyles, useTheme } from "@/theme";

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
        <Text style={styles.submitLoadingText}>{submissionMessage}</Text>
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
            <Text style={styles.captionButtonText}>
              {values.comment ? "Edit Caption" : "Add Caption"}
            </Text>
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
            <Text style={styles.characterCount}>
              {tempCaption?.length || 0}/500
            </Text>
            <TouchableOpacity
              style={[
                styles.saveCaptionButton,
                (!tempCaption || tempCaption.trim().length === 0) &&
                  styles.saveCaptionButtonDisabled,
              ]}
              onPress={() => {
                if (tempCaption && tempCaption.trim().length > 0) {
                  setValue("comment", tempCaption.trim(), {
                    shouldValidate: true,
                  });
                  setIsCaptionFocused(false);
                }
              }}
              disabled={!tempCaption || tempCaption.trim().length === 0}
            >
              <Text style={styles.saveCaptionButtonText}>Save Caption</Text>
            </TouchableOpacity>
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
        console.error("No photo to upload");
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

      const base64 = await FileSystem.readAsStringAsync(compressedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const fileData = decode(base64);

      const { data, error } = await supabase.storage
        .from("review_images")
        .upload(filePath, fileData, {
          contentType: "image/jpeg",
        });

      if (error || !data) {
        console.error("Error uploading image:", error);
        return null;
      }

      return data.path;
    } catch (error) {
      console.error("Exception while uploading image:", error);
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
      console.error("Error getting types:", error);
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
      console.error("Error getting spirits:", error);
      setSpirits([]);
      setOptionsError("We couldn't load spirits.");
    }
  };

  const retryLoadOptions = async () => {
    setOptionsError(null);
    await Promise.all([getTypes(), getSpirits()]);
  };

  const createReview = async (userId: string, imageUrl: string) => {
    try {
      const locationId = await databaseService.createOrGetLocation(
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
      console.error("Error creating review:", error);
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
      const reviewId = await createReview(profile.id, imageUrl);
      if (!reviewId) {
        setSubmitError("We couldn't save your review. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Only send notifications if not in development mode
      if (!isDevelopmentMode()) {
        try {
          const notificationBody = `${
            profile.username
          } has posted a new review from ${
            (watchedValues.location as any)?.name || "a location"
          }`;
          await databaseService.createNotification({
            user_id: profile.id,
            body: notificationBody,
            type: NOTIFICATION_TYPES.FOLLOWERS,
          });
        } catch (error) {
          console.error("Error inserting notification:", error);
        }
      } else {
        console.log(
          "🚧 Development mode - skipping notification for new review"
        );
      }

      setSubmissionMessage("Review created successfully!");
      setIsSubmitting(false);

      // Track new review event
      AnalyticService.capture("new_review", {
        reviewId,
        locationId: (watchedValues.location as any)?.id,
        locationName: (watchedValues.location as any)?.name,
      });

      setStep(0);
      setPhoto(null);
      setIsReviewing(false);
      reset();
      // Return to wherever the review flow was started (feed, a place
      // profile, ...) instead of always landing on the Profile tab.
      if (router.canGoBack()) {
        router.back();
      } else {
        router.navigate("/profile");
      }
    } catch (error) {
      console.error("Error submitting review:", error);
      setSubmitError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
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
              <Text style={styles.title}>{questions[step].title}</Text>
              {questions[step].title !== "Preview" && (
                <>
                  <Text style={styles.subtitle}>
                    Step {step + 1} of {questions.length - 1}
                  </Text>
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
                <Text style={styles.inlineErrorText}>
                  {submitError || optionsError}
                </Text>
                <TouchableOpacity
                  onPress={
                    submitError ? () => setSubmitError(null) : retryLoadOptions
                  }
                >
                  <Text style={styles.inlineErrorAction}>
                    {submitError ? "Dismiss" : "Retry"}
                  </Text>
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
                  onPress={cancelCapture}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={colors.danger}
                  />
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
    ...t.typography.display,
    color: t.colors.text,
    textAlign: "center" as const,
    marginBottom: t.spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    marginBottom: 15,
  },
  inlineError: {
    backgroundColor: t.colors.dangerSubtle,
    borderRadius: t.radius.sm + 2,
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
    color: t.colors.danger,
    fontSize: 14,
    flexShrink: 1,
  },
  inlineErrorAction: {
    color: t.colors.danger,
    fontSize: 14,
    fontWeight: "700" as const,
  },
  progressBar: {
    height: 4,
    backgroundColor: t.colors.border,
    borderRadius: 2,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%" as const,
    backgroundColor: t.colors.accent,
    borderRadius: 2,
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
    padding: t.spacing.md,
    borderRadius: 25,
    backgroundColor: t.colors.dangerSubtle,
    borderWidth: 1,
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
    borderRadius: t.radius.md,
  },
  captionButton: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.xl - 4,
    paddingVertical: t.spacing.md,
    borderRadius: 25,
    backgroundColor: t.colors.accent,
    minHeight: 50,
  },
  captionButtonText: {
    fontSize: 16,
    color: t.colors.onAccent,
    fontWeight: "600" as const,
  },
  captionInput: {
    fontSize: 16,
    minHeight: 60,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.sm,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: t.colors.border,
    color: t.colors.text,
    textAlignVertical: "top" as const,
  },
  characterCount: {
    fontSize: 12,
    color: t.colors.textSecondary,
    textAlign: "right" as const,
    marginTop: t.spacing.xs,
  },
  hintText: {
    fontSize: 14,
    color: t.colors.textSecondary,
    textAlign: "center" as const,
    marginTop: t.spacing.sm,
    fontStyle: "italic" as const,
  },
  saveCaptionButton: {
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.xl - 4,
    paddingVertical: t.spacing.md,
    borderRadius: 25,
    backgroundColor: t.colors.accent,
    marginTop: t.spacing.md,
    minHeight: 50,
  },
  saveCaptionButtonText: {
    fontSize: 16,
    color: t.colors.onAccent,
    fontWeight: "600" as const,
  },
  saveCaptionButtonDisabled: {
    opacity: 0.5,
  },
  submitLoadingContainer: {
    flex: 1,
    justifyContent: "center" as const,
    alignItems: "center" as const,
    paddingHorizontal: 40,
  },
  submitLoadingText: {
    fontSize: 18,
    fontWeight: "600" as const,
    color: t.colors.accent,
    marginTop: t.spacing.xl - 4,
    textAlign: "center" as const,
  },
}));
