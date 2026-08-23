import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Keyboard,
  Pressable,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  ActivityIndicator,
  Alert,
  Animated,
  ScrollView,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useForm, useWatch } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import { useGoBack } from "@/hooks/useAppNavigation";
import AppHeader, { type HeaderAction } from "@/components/nav/AppHeader";
import CameraComponent from "@/components/CameraComponent";
import LocationInput from "@/components/LocationInput";
import TasteInput from "@/components/TasteInput";
import PresentationInput from "@/components/PresentationInput";
import SelectableOptionsInput from "@/components/SelectableOptionsInput";
import ReviewItem from "@/components/ReviewItem";
import CelebrationModal from "@/components/CelebrationModal";
import { File } from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { useProfile } from "@/context/profile-context";
import { useMembership } from "@/context/membership-context";
import { AppText, Button } from "@/components/shared";
import { supabase } from "@/utils/supabase";
import databaseService from "@/services/databaseService";
import AnalyticService from "@/services/analyticsService";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";
import { routes } from "@/utils/routes";
import {
  checkRankUp,
  collectAchievements,
  isRegularAt,
  type Achievement,
} from "@/utils/celebrations";
import { RATING_MIN } from "@/utils/ratingUtils";
import { isReviewStepComplete } from "@/utils/reviewStepValidation";
import { publishReviewUpdated } from "@/utils/reviewEvents";
import {
  completePostReview,
  ReviewSubmissionError,
  submitNewReview,
} from "@/utils/reviewSubmission";
import {
  prepareReviewImageForUpload,
  type ReviewImageSource,
} from "@/utils/reviewImage";

interface ReviewFormLocation {
  name: string;
  address: string;
  coordinates?: { latitude: number; longitude: number };
  place_id?: string;
  id?: string;
}

interface ReviewFormValues {
  location: ReviewFormLocation | null;
  spirit: string | number;
  type: string | number;
  taste: number;
  presentation: number;
  comment: string;
}

type Option = { id: number; name: string };

type ReviewQuestionKey =
  "location" | "spirit" | "type" | "taste" | "presentation" | "comment";

const REVIEW_QUESTIONS: { title: string; key?: ReviewQuestionKey }[] = [
  { title: "Where was this served?", key: "location" },
  { title: "Which Spirit?", key: "spirit" },
  { title: "Which Type?", key: "type" },
  { title: "Presentation Rating", key: "presentation" },
  { title: "Taste Rating", key: "taste" },
  { title: "Add a Caption", key: "comment" },
  { title: "Preview" },
];

const STEP_FADE_OUT_MS = 150;
const STEP_FADE_IN_MS = 220;

const ReviewPreview = ({
  values,
  spirits,
  types,
  photo,
  profile,
  isSubmitting,
  submissionMessage,
}: {
  values: ReviewFormValues;
  spirits: { id: number; name: string }[];
  types: { id: number; name: string }[];
  photo: string | null;
  profile: any;
  isSubmitting?: boolean;
  submissionMessage?: string;
}) => {
  const styles = useStyles();
  const { colors } = useTheme();

  const mockReview = useMemo(
    () =>
      ({
        id: "preview",
        user_id: profile?.id || "",
        image_url: photo || "",
        comment: values.comment || "",
        taste: values.taste || RATING_MIN,
        presentation: values.presentation || RATING_MIN,
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
      style={styles.previewContainer}
      contentContainerStyle={styles.previewScrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
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
    </ScrollView>
  );
};

function ReviewComposer() {
  const styles = useStyles();
  const { colors } = useTheme();
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoDimensions, setPhotoDimensions] = useState<Pick<
    ReviewImageSource,
    "width" | "height"
  > | null>(null);
  const photoAspectRatio =
    photoDimensions?.width && photoDimensions?.height
      ? photoDimensions.width / photoDimensions.height
      : null;
  const [photoPreviewBounds, setPhotoPreviewBounds] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const photoPreviewFrameSize =
    photoAspectRatio && photoPreviewBounds
      ? photoAspectRatio >= photoPreviewBounds.width / photoPreviewBounds.height
        ? { width: "100%" as const, aspectRatio: photoAspectRatio }
        : { height: "100%" as const, aspectRatio: photoAspectRatio }
      : null;
  const [isReviewing, setIsReviewing] = useState(false);
  const [isPhotoPreviewing, setIsPhotoPreviewing] = useState(false);
  const [selectedLocation, setSelectedLocation] =
    useState<ReviewFormLocation | null>(null);
  const [step, setStep] = useState(0);

  const [types, setTypes] = useState<Option[]>([]);
  const [spirits, setSpirits] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [photoChanged, setPhotoChanged] = useState(false);
  const [originalImagePath, setOriginalImagePath] = useState<string | null>(
    null
  );
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
  const rawEditReviewId = params.editReviewId;
  const editReviewId = Array.isArray(rawEditReviewId)
    ? rawEditReviewId[0]
    : rawEditReviewId;
  const isEditMode = Boolean(editReviewId);
  const locationNameParam = params.locationName;
  const locationAddressParam = params.locationAddress;
  const locationLatParam = params.locationLat;
  const locationLonParam = params.locationLon;
  const locationPlaceIdParam = params.locationPlaceId;

  const { control, formState, handleSubmit, reset, trigger, setValue } =
    useForm<ReviewFormValues>({
      mode: "onChange",
      shouldUnregister: false,
      defaultValues: {
        location: null,
        spirit: "",
        type: "",
        taste: RATING_MIN,
        presentation: RATING_MIN,
        comment: "",
      },
      resolver: undefined,
    });
  const insets = useSafeAreaInsets();
  const watchedValues = useWatch({ control }) as ReviewFormValues;

  const getTypes = useCallback(async () => {
    try {
      const data = await databaseService.getTypes({ forceRefresh: true });
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
      const data = await databaseService.getSpirits({ forceRefresh: true });
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
    if (!editReviewId || !profile?.id) return;

    let active = true;

    databaseService
      .getEditableReview(editReviewId, profile.id)
      .then((review) => {
        if (!active) return;

        reset({
          location: review.location_details
            ? {
                id: String(review.location_details.id),
                name: review.location_details.name,
                address: review.location_details.address || "",
                place_id: review.location_details.place_id || undefined,
              }
            : null,
          spirit: review.spirit,
          type: review.type,
          taste: Number(review.taste),
          presentation: Number(review.presentation),
          comment: review.comment || "",
        });
        setPhoto(review.display_image_url);
        setPhotoDimensions(null);
        setOriginalImagePath(review.image_url);
        setPhotoChanged(false);
        setIsReviewing(true);
        setStep(0);
      })
      .catch((error) => {
        reportError("Error loading review for editing:", error);
        Alert.alert(
          "Review unavailable",
          "This review could not be loaded for editing.",
          [{ text: "OK", onPress: goBack }]
        );
      });
    return () => {
      active = false;
    };
  }, [editReviewId, goBack, profile?.id, reset]);

  useEffect(() => {
    if (!isEditMode && locationNameParam && locationAddressParam) {
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
    isEditMode,
    setValue,
  ]);

  const questions = REVIEW_QUESTIONS;

  const animatedStyle = { opacity };

  const discardReview = () => {
    setStep(0);
    setPhoto(null);
    setPhotoDimensions(null);
    setIsReviewing(false);
    setIsSubmitting(false);
    setSubmissionMessage("");
    setIsChangingPhoto(false);
    setPhotoChanged(false);
    setOriginalImagePath(null);
    reset();
    if (isEditMode) {
      goBack();
    } else {
      setIsPhotoPreviewing(false);
      setIsReviewing(false);
    }
  };

  const confirmDiscardReview = () => {
    Alert.alert(
      isEditMode ? "Cancel editing?" : "Quit review?",
      isEditMode
        ? "Your changes will not be saved."
        : "Your photo and review details will be lost.",
      [
        { text: "Keep editing", style: "cancel" },
        {
          text: isEditMode ? "Discard changes" : "Quit",
          style: "destructive",
          onPress: discardReview,
        },
      ]
    );
  };

  const transitionToStep = (next: number) => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    Animated.timing(opacity, {
      toValue: 0,
      duration: STEP_FADE_OUT_MS,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) {
        setIsTransitioning(false);
        return;
      }

      setStep(next);
      requestAnimationFrame(() => {
        Animated.timing(opacity, {
          toValue: 1,
          duration: STEP_FADE_IN_MS,
          useNativeDriver: false,
        }).start(() => setIsTransitioning(false));
      });
    });
  };

  const nextStep = async () => {
    if (isTransitioning) return;

    if (questions[step].key === "comment") {
      // The caption is required before the preview; form rules don't cover
      // whitespace-only input, so check the trimmed value directly.
      if (!watchedValues.comment?.trim()) return;
    }
    if (questions[step].key) {
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
        return (
          <LocationInput
            control={control}
            onLocationSelected={(location) => {
              if (!location) {
                setSelectedLocation(null);
                return;
              }
              setSelectedLocation({
                ...location,
                address: location.address ?? "",
              });
              setValue(
                "location",
                {
                  ...location,
                  address: location.address ?? "",
                },
                {
                  shouldDirty: true,
                  shouldTouch: true,
                  shouldValidate: true,
                }
              );
            }}
          />
        );
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
          <ScrollView
            style={styles.typeStepScroller}
            contentContainerStyle={styles.typeStepContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <SelectableOptionsInput
              control={control}
              name="type"
              options={types}
            />
          </ScrollView>
        );
      case "presentation":
        return <PresentationInput control={control} />;
      case "taste":
        return <TasteInput control={control} />;
      case "comment":
        return (
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.captionInputContainer}>
              <TextInput
                style={styles.captionInput}
                multiline
                autoFocus
                placeholder="Add a caption..."
                placeholderTextColor={colors.textMuted}
                onChangeText={(caption) =>
                  setValue("comment", caption, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                value={watchedValues.comment || ""}
                maxLength={500}
                accessibilityLabel="Review caption"
              />
              <AppText
                variant="label"
                tone="secondary"
                style={styles.characterCount}
              >
                {(watchedValues.comment || "").length}/500
              </AppText>
            </View>
          </ScrollView>
        );
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

      const manipResult = await prepareReviewImageForUpload({
        uri: photo,
        ...photoDimensions,
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
    if (watchedValues.location?.id && !watchedValues.location.coordinates) {
      return watchedValues.location.id;
    }

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

  const removeReviewImage = async (imagePath: string | null) => {
    if (!imagePath) return;
    const { error } = await supabase.storage
      .from("review_images")
      .remove([imagePath]);
    if (error) reportError("Error removing review image:", error);
  };

  const handleUpdateReview = async () => {
    if (!profile || !editReviewId || !originalImagePath) return;

    let uploadedImagePath: string | null = null;
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      if (photoChanged) {
        setSubmissionMessage("Uploading new image...");
        uploadedImagePath = await uploadImage(profile.id);
        if (!uploadedImagePath) {
          throw new Error("Replacement image upload failed.");
        }
      }

      setSubmissionMessage("Saving changes...");
      const locationId = await resolveLocationId(profile.id);
      await databaseService.updateReview(
        editReviewId,
        {
          image_url: uploadedImagePath || originalImagePath,
          location: locationId,
          spirit: watchedValues.spirit,
          type: watchedValues.type,
          taste: watchedValues.taste,
          presentation: watchedValues.presentation,
          comment: watchedValues.comment?.trim() || "",
        },
        profile.id
      );

      if (uploadedImagePath && uploadedImagePath !== originalImagePath) {
        await removeReviewImage(originalImagePath);
      }

      AnalyticService.capture("edit_review", {
        reviewId: editReviewId,
        locationId,
        locationName: watchedValues.location?.name ?? null,
        photoChanged,
      });
      publishReviewUpdated(String(editReviewId));
      goBack();
    } catch (error) {
      reportError("Error updating review:", error);
      if (uploadedImagePath) await removeReviewImage(uploadedImagePath);
      setSubmitError("We couldn't save your changes. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleUploadAndCreateReview = async () => {
    if (!profile) return;

    let reviewId: string;
    let locationId: string;
    let numericLocationId: number | null = null;
    let wasRegular = false;

    try {
      setIsSubmitting(true);
      setSubmitError(null);
      const submission = await submitNewReview({
        uploadImage: () => uploadImage(profile.id),
        resolveLocationId: () => resolveLocationId(profile.id),
        createReview: (imagePath, resolvedLocationId) =>
          createReview(profile.id, imagePath, resolvedLocationId),
        removeImage: removeReviewImage,
        afterLocationResolved: async (resolvedLocationId) => {
          const parsedLocationId = Number(resolvedLocationId);
          numericLocationId = Number.isFinite(parsedLocationId)
            ? parsedLocationId
            : null;
          try {
            wasRegular = numericLocationId
              ? (await isRegularAt(numericLocationId, profile.id)) === true
              : false;
          } catch (error) {
            reportError("Error checking existing Regular status:", error);
            wasRegular = false;
          }
        },
        onStage: (stage) => {
          if (stage === "location")
            setSubmissionMessage("Confirming location...");
          if (stage === "upload") setSubmissionMessage("Uploading image...");
          if (stage === "review") setSubmissionMessage("Creating review...");
        },
        onLocationResolutionError: (error) =>
          reportError("Error resolving location:", error),
        onCleanupError: (error) =>
          reportError("Error cleaning up review image:", error),
      });
      reviewId = submission.reviewId;
      locationId = submission.locationId;
    } catch (error) {
      reportError("Error submitting review:", error);
      setSubmitError(
        error instanceof ReviewSubmissionError && error.stage === "upload"
          ? "We couldn't upload your photo. Please try again."
          : error instanceof ReviewSubmissionError && error.stage === "location"
            ? "We couldn't confirm this location. Please try again."
            : error instanceof ReviewSubmissionError && error.stage === "review"
              ? "We couldn't save your review. Please try again."
              : "Something went wrong. Please try again."
      );
      setIsSubmitting(false);
      return;
    }

    const locationName = (watchedValues.location as any)?.name ?? null;
    setSubmissionMessage("Review created successfully!");
    setPostedReviewId(String(reviewId));

    try {
      AnalyticService.capture("new_review", {
        reviewId,
        locationId,
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

      completePostReview({
        hasAchievements: earnedAchievements.length > 0,
        showCelebration: () => {
          setCelebrationReviewCount(rankCheck.newCount);
          setAchievements(earnedAchievements);
        },
        navigateToFeed: () =>
          router.dismissTo(feedRouteAfterPost(String(reviewId))),
        refreshProfile,
      });
    } catch (error) {
      reportError("Review created but post-submit processing failed:", error);
      router.dismissTo(feedRouteAfterPost(String(reviewId)));
    }
  };

  const finishCelebration = () => {
    const reviewId = postedReviewId;

    setAchievements([]);
    setCelebrationReviewCount(null);
    requestAnimationFrame(() => {
      router.dismissTo(feedRouteAfterPost(reviewId));
      void refreshProfile();
    });
  };

  const reviewStepTotal = questions.length + 2;
  const currentQuestionTitle = questions[step].title;
  const currentQuestionKey = questions[step].key;
  const currentStepIncomplete = !isReviewStepComplete(
    currentQuestionKey,
    {
      ...watchedValues,
      location: watchedValues.location || selectedLocation,
    },
    {
      taste: isEditMode || Boolean(formState.touchedFields.taste),
      presentation: isEditMode || Boolean(formState.touchedFields.presentation),
    }
  );
  const submitReview = () => {
    const commentValue = watchedValues.comment?.trim();
    if (!isEditMode && (!commentValue || commentValue.length === 0)) return;
    handleSubmit(
      isEditMode ? handleUpdateReview : handleUploadAndCreateReview
    )();
  };
  const reviewHeaderActions: HeaderAction[] = [
    ...(isEditMode
      ? ([
          {
            icon: "camera-outline",
            onPress: () => {
              setIsChangingPhoto(true);
              setIsReviewing(false);
            },
            accessibilityLabel: "Change review photo",
          },
        ] satisfies HeaderAction[])
      : []),
    ...(step < questions.length - 1
      ? [
          {
            icon: "chevron-forward",
            onPress: nextStep,
            accessibilityLabel: "Next step",
            disabled: isTransitioning || currentStepIncomplete,
          } satisfies HeaderAction,
        ]
      : [
          {
            icon: "close-outline",
            onPress: confirmDiscardReview,
            accessibilityLabel: isEditMode
              ? "Cancel editing review"
              : "Quit review",
          } satisfies HeaderAction,
          {
            label: isEditMode ? "Save" : "Post",
            onPress: submitReview,
            accessibilityLabel: isEditMode ? "Save review" : "Post review",
            disabled:
              !isEditMode &&
              (!watchedValues.comment ||
                watchedValues.comment.trim().length === 0),
          } satisfies HeaderAction,
        ]),
  ];

  const returnToPhotoPreview = () => {
    setIsPhotoPreviewing(true);
    setIsReviewing(false);
  };

  const continueFromPhotoPreview = () => {
    setIsPhotoPreviewing(false);
    setIsReviewing(true);
    setStep(0);
  };

  const returnToCamera = () => {
    setPhoto(null);
    setPhotoDimensions(null);
    setIsPhotoPreviewing(false);
    setIsReviewing(false);
  };

  return (
    <>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        {isEditMode && !isReviewing && !isChangingPhoto ? (
          <View style={styles.editLoadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
            <AppText variant="bodyStrong" tone="secondary">
              Loading review...
            </AppText>
          </View>
        ) : !isReviewing && !isPhotoPreviewing ? (
          <CameraComponent
            title={isChangingPhoto ? "Change Photo" : "Capture"}
            closeAccessibilityLabel={
              isChangingPhoto ? "Keep current review photo" : "Discard review"
            }
            closeIcon="close-outline"
            onClose={
              isChangingPhoto
                ? () => {
                    setIsChangingPhoto(false);
                    setIsReviewing(true);
                  }
                : goBack
            }
            headerBelow={
              !isChangingPhoto ? (
                <View style={styles.stepHeaderMeta}>
                  <AppText
                    variant="eyebrow"
                    tone="onImage"
                    style={styles.subtitle}
                  >
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
              ) : undefined
            }
            onCapture={(captured) => {
              setPhoto(captured.uri);
              setPhotoDimensions({
                width: captured.width,
                height: captured.height,
              });
              setPhotoChanged(isEditMode);
              setIsChangingPhoto(false);
              setIsPhotoPreviewing(true);
              setIsReviewing(false);
              setIsSubmitting(false);
              setSubmissionMessage("");
            }}
          />
        ) : isPhotoPreviewing ? (
          <View style={styles.photoPreviewScreen}>
            <AppHeader
              variant="large"
              title="Preview"
              onBack={returnToCamera}
              below={
                <View style={styles.stepHeaderMeta}>
                  <AppText
                    variant="eyebrow"
                    tone="onImage"
                    style={styles.subtitle}
                  >
                    Step 2 of {reviewStepTotal}
                  </AppText>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${(2 / reviewStepTotal) * 100}%` },
                      ]}
                    />
                  </View>
                </View>
              }
              actions={[
                {
                  icon: "chevron-forward",
                  onPress: continueFromPhotoPreview,
                  accessibilityLabel: "Continue with photo",
                },
              ]}
            />
            <View
              style={styles.photoPreviewContent}
              onLayout={({ nativeEvent: { layout } }) => {
                if (
                  layout.width !== photoPreviewBounds?.width ||
                  layout.height !== photoPreviewBounds?.height
                ) {
                  setPhotoPreviewBounds({
                    width: layout.width,
                    height: layout.height,
                  });
                }
              }}
            >
              {photo ? (
                <View
                  style={[
                    styles.photoPreviewFrame,
                    photoPreviewFrameSize ?? styles.photoPreviewFrameFallback,
                  ]}
                >
                  <ExpoImage
                    source={{ uri: photo }}
                    style={styles.photoPreviewImage}
                    contentFit="contain"
                    onLoad={({ source }) => {
                      if (
                        !photoDimensions &&
                        source.width > 0 &&
                        source.height > 0
                      ) {
                        setPhotoDimensions({
                          width: source.width,
                          height: source.height,
                        });
                      }
                    }}
                  />
                </View>
              ) : null}
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
                <View style={styles.navLeft} />
                <Pressable
                  onPress={confirmDiscardReview}
                  style={styles.footerClose}
                  accessibilityLabel={
                    isEditMode ? "Cancel editing review" : "Quit review"
                  }
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="close-outline"
                    size={22}
                    color={colors.text}
                  />
                </Pressable>
                <View style={styles.navRight} />
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.container}>
            {!isSubmitting && (
              <AppHeader
                variant="large"
                title={currentQuestionTitle}
                actions={reviewHeaderActions}
                leading={
                  currentQuestionTitle === "Preview"
                    ? {
                        icon: "chevron-back",
                        onPress: prevStep,
                        accessibilityLabel: "Back",
                        disabled: isTransitioning,
                      }
                    : undefined
                }
                onBack={
                  currentQuestionTitle === "Preview"
                    ? undefined
                    : step > 0
                      ? prevStep
                      : returnToPhotoPreview
                }
                below={
                  currentQuestionTitle === "Preview" ? (
                    <View style={styles.stepHeaderMeta}>
                      <AppText
                        variant="eyebrow"
                        tone="onImage"
                        style={styles.subtitle}
                      >
                        Step {step + 3} of {reviewStepTotal}
                      </AppText>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${((step + 3) / reviewStepTotal) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  ) : (
                    <View style={styles.stepHeaderMeta}>
                      <AppText
                        variant="eyebrow"
                        tone="onImage"
                        style={styles.subtitle}
                      >
                        Step {step + 3} of {reviewStepTotal}
                      </AppText>
                      <View style={styles.progressBar}>
                        <View
                          style={[
                            styles.progressFill,
                            {
                              width: `${((step + 3) / reviewStepTotal) * 100}%`,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  )
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
                  isSubmitting={isSubmitting}
                  submissionMessage={submissionMessage}
                />
              ) : (
                renderCurrentQuestion()
              )}
            </Animated.View>

            {!isSubmitting && currentQuestionTitle !== "Preview" && (
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
                  <View style={styles.navLeft} />
                  <Pressable
                    onPress={confirmDiscardReview}
                    style={styles.footerClose}
                    accessibilityLabel={
                      isEditMode ? "Cancel editing review" : "Quit review"
                    }
                    accessibilityRole="button"
                    disabled={isTransitioning}
                  >
                    <Ionicons
                      name="close-outline"
                      size={22}
                      color={colors.text}
                    />
                  </Pressable>

                  <View style={styles.navRight}>
                    <View />
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

export default function ReviewScreen() {
  const { profile, loading } = useProfile();
  const { openMembership } = useMembership();
  const hasPrompted = React.useRef(false);

  // Focus-gated on purpose: once a member has opened the Review tab this
  // screen stays mounted in the background, so logout nulls `profile` while
  // it is not the screen the user is looking at. Only a visitor actually
  // focused on the Review tab (e.g. via deep link) should be offered
  // membership; the background case would push the sheet on top of the
  // logout navigation.
  useFocusEffect(
    useCallback(() => {
      if (!loading && !profile && !hasPrompted.current) {
        hasPrompted.current = true;
        openMembership("review");
      }
    }, [loading, openMembership, profile])
  );

  if (loading || !profile) return null;
  return <ReviewComposer />;
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  editLoadingContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    gap: t.spacing.md,
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
    ...t.typography.label,
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
  typeStepScroller: {
    flex: 1,
  },
  typeStepContent: {
    flexGrow: 1,
    paddingBottom: t.spacing.xxl,
  },
  footer: {
    paddingHorizontal: t.spacing.xl - 4,
    paddingTop: t.spacing.sm + 2,
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
  footerClose: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  previewContainer: {
    flex: 1,
    width: "100%" as const,
  },
  photoPreviewScreen: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  photoPreviewContent: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    padding: t.spacing.xl,
  },
  photoPreviewFrame: {
    maxWidth: "100%" as const,
    maxHeight: "100%" as const,
    overflow: "hidden" as const,
    borderRadius: t.radius.card,
    borderCurve: "continuous" as const,
  },
  photoPreviewFrameFallback: {
    width: "100%" as const,
    height: "100%" as const,
  },
  photoPreviewImage: {
    width: "100%" as const,
    height: "100%" as const,
    borderRadius: t.radius.card,
    borderCurve: "continuous" as const,
  },
  previewWrapper: {
    overflow: "hidden" as const,
    paddingHorizontal: t.spacing.md,
    alignItems: "center" as const,
  },
  previewScrollContent: {
    paddingBottom: t.spacing.xl,
  },
  scaledReviewContainer: {
    width: "115%" as const,
    alignSelf: "center" as const,
    marginLeft: "-7.5%" as const,
    transform: [{ scale: 0.82 }],
    transformOrigin: "top center",
  },
  captionInputContainer: {
    backgroundColor: t.colors.background,
    borderRadius: t.radius.input,
    marginTop: t.spacing.md,
  },
  captionInput: {
    ...t.typography.input,
    minHeight: 100,
    paddingHorizontal: t.spacing.md,
    paddingVertical: t.spacing.sm,
    borderRadius: t.radius.input,
    backgroundColor: t.colors.surfaceSunken,
    borderWidth: 1,
    borderColor: t.colors.border,
    color: t.colors.inputText,
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
