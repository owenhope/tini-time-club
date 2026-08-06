import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import { useForm, useWatch } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useGoBack } from "@/hooks/useAppNavigation";
import AppHeader from "@/components/nav/AppHeader";
import CameraComponent from "@/components/CameraComponent";
import LocationInput from "@/components/LocationInput";
import TasteInput from "@/components/TasteInput";
import PresentationInput from "@/components/PresentationInput";
import SelectableOptionsInput from "@/components/SelectableOptionsInput";
import ReviewItem from "@/components/ReviewItem";
import CelebrationModal from "@/components/CelebrationModal";
import { File } from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as ImageManipulator from "expo-image-manipulator";
import { useProfile } from "@/context/profile-context";
import { AppText, Button } from "@/components/shared";
import { supabase } from "@/utils/supabase";
import databaseService from "@/services/databaseService";
import AnalyticService from "@/services/analyticsService";
import { fonts, makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import {
  checkRankUp,
  collectAchievements,
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

type ReviewQuestionKey =
  "location" | "spirit" | "type" | "taste" | "presentation";

const REVIEW_QUESTIONS: { title: string; key?: ReviewQuestionKey }[] = [
  { title: "Where was this served?", key: "location" },
  { title: "Which Spirit?", key: "spirit" },
  { title: "Which Type?", key: "type" },
  { title: "Presentation Rating", key: "presentation" },
  { title: "Taste Rating", key: "taste" },
  { title: "Preview" },
];

const STEP_FADE_OUT_MS = 120;
const STEP_FADE_IN_MS = 160;

const ReviewPreview = ({
  values,
  spirits,
  types,
  photo,
  profile,
  isCaptionFocused,
  setIsCaptionFocused,
  onCaptionDraftChange,
  isSubmitting,
  submissionMessage,
}: {
  values: ReviewFormValues;
  spirits: { id: number; name: string }[];
  types: { id: number; name: string }[];
  photo: string | null;
  profile: any;
  isCaptionFocused: boolean;
  setIsCaptionFocused: React.Dispatch<React.SetStateAction<boolean>>;
  onCaptionDraftChange: (caption: string) => void;
  isSubmitting?: boolean;
  submissionMessage?: string;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();
  const scrollViewRef = React.useRef<ScrollView>(null);
  const [captionDraft, setCaptionDraft] = useState(values.comment || "");

  const mockReview = useMemo(
    () =>
      ({
        id: "preview",
        user_id: profile?.id || "",
        image_url: photo || "",
        comment: values.comment || "",
        taste: values.taste || 0,
        presentation: values.presentation || 0,
        inserted_at: new Date().toISOString(),
        profile: {
          id: profile?.id || "",
          username: profile?.username || "You",
          avatar_url: profile?.avatar_url || null,
        },
        spirit: spirits.find((s) => String(s.id) === String(values.spirit)) || {
          name: "Unknown",
        },
        type: types.find((t) => String(t.id) === String(values.type)) || {
          name: "Unknown",
        },
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
    [values, spirits, types, photo, profile]
  );

  const mockHandlers = {
    onDelete: () => {},
    onEdit: () => {},
    onShowLikes: () => {},
    onShowComments: () => {},
    onCommentAdded: () => {},
    onCommentDeleted: () => {},
  };

  const openCaptionInput = () => {
    const initialCaption = values.comment || "";
    setCaptionDraft(initialCaption);
    onCaptionDraftChange(initialCaption);
    setIsCaptionFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const updateCaptionDraft = (caption: string) => {
    setCaptionDraft(caption);
    onCaptionDraftChange(caption);
  };

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
              placeholder="Shaken, stirred, or mildly disappointed?"
              placeholderTextColor={colors.textMuted}
              onChangeText={updateCaptionDraft}
              value={captionDraft}
              maxLength={500}
              autoFocus={true}
            />
            <AppText
              variant="label"
              tone="secondary"
              style={styles.characterCount}
            >
              {captionDraft.length}/500
            </AppText>
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
  const [isCaptionFocused, setIsCaptionFocused] = useState(false);
  const captionDraftRef = React.useRef("");
  const captionCanSaveRef = React.useRef(false);
  const [captionCanSave, setCaptionCanSave] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [celebrationReviewCount, setCelebrationReviewCount] = useState<
    number | null
  >(null);
  const [postedReviewId, setPostedReviewId] = useState<string | null>(null);
  const [opacity] = useState(() => new Animated.Value(1));
  const router = useRouter();
  const goBack = useGoBack();
  const params = useLocalSearchParams();
  const { profile, refreshProfile } = useProfile();
  const locationNameParam = params.locationName;
  const locationAddressParam = params.locationAddress;
  const locationLatParam = params.locationLat;
  const locationLonParam = params.locationLon;
  const locationPlaceIdParam = params.locationPlaceId;

  const { control, handleSubmit, reset, trigger, setValue } =
    useForm<ReviewFormValues>({
      mode: "onChange",
      shouldUnregister: false,
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
  const watchedValues = useWatch({ control }) as ReviewFormValues;

  const handleCaptionDraftChange = useCallback((caption: string) => {
    captionDraftRef.current = caption;
    const canSave = caption.trim().length > 0;
    if (captionCanSaveRef.current !== canSave) {
      captionCanSaveRef.current = canSave;
      setCaptionCanSave(canSave);
    }
  }, []);

  const getTypes = useCallback(async () => {
    try {
      const data = await databaseService.getTypes();
      setTypes(data);
      setOptionsError(null);
    } catch (error) {
      reportError("Error getting types:", error);
      setTypes([]);
      setOptionsError("We couldn't load Martini types.");
    }
  }, []);

  const getSpirits = useCallback(async () => {
    try {
      const data = await databaseService.getSpirits();
      setSpirits(data);
      setOptionsError(null);
    } catch (error) {
      reportError("Error getting spirits:", error);
      setSpirits([]);
      setOptionsError("We couldn't load spirits.");
    }
  }, []);

  useEffect(() => {
    getTypes();
    getSpirits();
  }, [getTypes, getSpirits]);

  useEffect(() => {
    if (locationNameParam && locationAddressParam) {
      setValue("location", {
        name: locationNameParam as string,
        address: locationAddressParam as string,
        coordinates:
          locationLatParam && locationLonParam
            ? {
                latitude: parseFloat(locationLatParam as string),
                longitude: parseFloat(locationLonParam as string),
              }
            : undefined,
        place_id: locationPlaceIdParam as string | undefined,
      });
    }
  }, [
    locationNameParam,
    locationAddressParam,
    locationLatParam,
    locationLonParam,
    locationPlaceIdParam,
    setValue,
  ]);

  const questions = REVIEW_QUESTIONS;

  const animatedStyle = { opacity };

  const cancelCapture = () => {
    setStep(0);
    setPhoto(null);
    setIsReviewing(false);
    setIsSubmitting(false);
    setSubmissionMessage("");
    setIsCaptionFocused(false);
    captionDraftRef.current = "";
    captionCanSaveRef.current = false;
    setCaptionCanSave(false);
    reset();
  };

  const saveCaption = () => {
    const caption = captionDraftRef.current.trim();
    if (!caption) return;

    setValue("comment", caption, { shouldValidate: true });
    setIsCaptionFocused(false);
    captionCanSaveRef.current = false;
    setCaptionCanSave(false);
    Keyboard.dismiss();
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

  const transitionToStep = (next: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    Animated.timing(opacity, {
      toValue: 0,
      duration: STEP_FADE_OUT_MS,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (!finished) {
        setIsTransitioning(false);
        return;
      }

      setStep(next);
      Animated.timing(opacity, {
        toValue: 1,
        duration: STEP_FADE_IN_MS,
        useNativeDriver: true,
      }).start(() => setIsTransitioning(false));
    });
  };

  const nextStep = async () => {
    if (isTransitioning) return;

    if (step === questions.length - 1) {
      const commentValue = watchedValues.comment?.trim();
      if (!commentValue || commentValue.length === 0) return;
      const isValid = await trigger("comment");
      if (!isValid) return;
    } else if (questions[step].key) {
      const isValid = await trigger(questions[step].key as any);
      if (!isValid) return;
    }

    if (step < questions.length - 1) {
      transitionToStep(step + 1);
    }
  };

  const prevStep = () => {
    if (step > 0 && !isTransitioning) transitionToStep(step - 1);
  };

  const renderCurrentQuestion = () => {
    switch (questions[step].key) {
      case "location":
        return <LocationInput control={control} />;
      case "spirit":
        return (
          <SelectableOptionsInput
            control={control}
            name="spirit"
            options={spirits}
          />
        );
      case "type":
        return (
          <SelectableOptionsInput
            control={control}
            name="type"
            options={types}
          />
        );
      case "presentation":
        return <PresentationInput control={control} />;
      case "taste":
        return <TasteInput control={control} />;
      default:
        return null;
    }
  };

  const uploadImage = async (userId: string) => {
    try {
      if (!photo) {
        reportError("No photo to upload");
        return null;
      }

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

  const retryLoadOptions = async () => {
    setOptionsError(null);
    await Promise.all([getTypes(), getSpirits()]);
  };

  const feedRouteAfterPost = (reviewId: string | null) =>
    routes.home({
      ...(reviewId ? { postedReviewId: reviewId } : {}),
      feedRefresh: String(Date.now()),
    });

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
    if (!profile) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      setSubmissionMessage("Uploading image...");
      const imageUrl = await uploadImage(profile.id);
      if (!imageUrl) {
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

      const locationName = (watchedValues.location as any)?.name ?? null;
      const numericLocationId =
        locationId != null && Number.isFinite(Number(locationId))
          ? Number(locationId)
          : null;
      const wasRegular = numericLocationId
        ? await isRegularAt(numericLocationId, profile.id)
        : false;

      const reviewId = await createReview(profile.id, imageUrl, locationId);
      if (!reviewId) {
        setSubmitError("We couldn't save your review. Please try again.");
        setIsSubmitting(false);
        return;
      }

      setSubmissionMessage("Review created successfully!");

      AnalyticService.capture("new_review", {
        reviewId,
        locationId: (watchedValues.location as any)?.id,
        locationName,
      });

      setSubmissionMessage("Checking your club status...");
      const [rankCheck, isRegular] = await Promise.all([
        checkRankUp(profile.id),
        numericLocationId
          ? isRegularAt(numericLocationId, profile.id)
          : Promise.resolve(false),
      ]);
      const earnedAchievements = collectAchievements({
        rankUp: rankCheck.rankUp,
        wasRegular,
        isRegular: isRegular === true,
        locationId: numericLocationId,
        locationName,
      });

      await refreshProfile();

      setPostedReviewId(String(reviewId));

      if (earnedAchievements.length > 0) {
        setCelebrationReviewCount(rankCheck.newCount);
        setAchievements(earnedAchievements);
      } else {
        router.dismissTo(feedRouteAfterPost(String(reviewId)));
      }
    } catch (error) {
      reportError("Error submitting review:", error);
      setSubmitError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  const finishCelebration = () => {
    const reviewId = postedReviewId;

    setAchievements([]);
    setCelebrationReviewCount(null);
    requestAnimationFrame(() => {
      router.dismissTo(feedRouteAfterPost(reviewId));
    });
  };

  const reviewStepTotal = questions.length;
  const currentQuestionTitle = questions[step].title;
  const headerTitle =
    currentQuestionTitle === "Preview" && isCaptionFocused
      ? "Caption"
      : currentQuestionTitle;

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        {!isReviewing ? (
          <CameraComponent
            onClose={goBack}
            headerBelow={
              <View style={styles.stepHeaderMeta}>
                <AppText variant="eyebrow" tone="onImage" style={styles.subtitle}>
                  Step 1 of {reviewStepTotal}
                </AppText>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${(1 / reviewStepTotal) * 100}%` },
                    ]}
                  />
                </View>
              </View>
            }
            onCapture={(captured) => {
              setPhoto(captured);
              setIsReviewing(true);
              setIsSubmitting(false);
              setSubmissionMessage("");
            }}
          />
        ) : (
          <View style={styles.container}>
            {!isSubmitting && (
              <AppHeader
                variant="large"
                title={headerTitle}
                below={
                  currentQuestionTitle !== "Preview" ? (
                    <View style={styles.stepHeaderMeta}>
                      <AppText
                        variant="eyebrow"
                        tone="onImage"
                        style={styles.subtitle}
                      >
                        Step {step + 2} of {reviewStepTotal}
                      </AppText>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${
                                ((step + 2) / reviewStepTotal) * 100
                              }%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ) : null
                }
              />
            )}

            <Animated.View
              style={[
                styles.content,
                currentQuestionTitle === "Preview" && styles.previewContent,
                currentQuestionTitle === "Where was this served?" &&
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

              {currentQuestionTitle === "Preview" ? (
                <ReviewPreview
                  values={watchedValues}
                  spirits={spirits}
                  types={types}
                  photo={photo}
                  profile={profile}
                  isCaptionFocused={isCaptionFocused}
                  setIsCaptionFocused={setIsCaptionFocused}
                  onCaptionDraftChange={handleCaptionDraftChange}
                  isSubmitting={isSubmitting}
                  submissionMessage={submissionMessage}
                />
              ) : (
                renderCurrentQuestion()
              )}
            </Animated.View>

            {!isSubmitting && (
              <View
                style={[
                  styles.footer,
                  {
                    paddingBottom: Math.max(insets.bottom, 10) + 6,
                    minHeight: 70 + Math.max(insets.bottom, 10),
                  },
                ]}
              >
                <Animated.View style={styles.navigation}>
                  <View style={styles.navLeft}>
                    {step > 0 && !isCaptionFocused && (
                      <Button
                        title="Back"
                        onPress={prevStep}
                        variant="ghost"
                        size="medium"
                        icon="chevron-back"
                        iconPosition="left"
                        disabled={isTransitioning}
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
                    {isCaptionFocused ? (
                      <Button
                        title="Save"
                        onPress={saveCaption}
                        variant="primary"
                        size="medium"
                        disabled={!captionCanSave}
                      />
                    ) : step < questions.length - 1 ? (
                      <Button
                        title="Next"
                        onPress={nextStep}
                        variant="primary"
                        size="medium"
                        icon="chevron-forward"
                        iconPosition="right"
                        disabled={isTransitioning}
                      />
                    ) : (
                      <Button
                        title="Post"
                        onPress={() => {
                          const commentValue = watchedValues.comment?.trim();
                          if (!commentValue || commentValue.length === 0) {
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
      {achievements.length > 0 && (
        <CelebrationModal
          achievements={achievements}
          profile={profile}
          reviewCount={celebrationReviewCount}
          onClose={finishCelebration}
        />
      )}
    </>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  stepHeaderMeta: {
    gap: t.spacing.sm,
  },
  subtitle: {
    color: t.colors.highlight,
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
    backgroundColor: t.colors.ratingTrackOnInk,
    borderRadius: t.radius.pill,
    overflow: "hidden" as const,
  },
  progressFill: {
    height: "100%" as const,
    backgroundColor: t.colors.highlight,
    borderRadius: t.radius.pill,
  },
  content: {
    flex: 1,
    paddingHorizontal: t.spacing.xl - 4,
    paddingTop: t.spacing.xl - 4,
    overflow: "hidden" as const,
    justifyContent: "flex-start" as const,
    alignItems: "stretch" as const,
  },
  previewContent: {
    paddingTop: t.spacing.sm + 2,
  },
  locationContent: {
    paddingTop: t.spacing.xl - 4,
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
    marginTop: t.spacing.md,
    paddingHorizontal: t.spacing.xl - 4,
    paddingVertical: t.spacing.md,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.accent,
    minHeight: 50,
  },
  captionInput: {
    ...t.typography.body,
    minHeight: 100,
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
