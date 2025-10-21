import React, { createElement, useEffect, useState, useMemo } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
  ActivityIndicator,
  Animated,
  ScrollView,
  Alert,
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
import { useRouter } from "expo-router";
import CameraComponent from "@/components/CameraComponent";
import LocationInput from "@/components/LocationInput";
import TasteInput from "@/components/TasteInput";
import PresentationInput from "@/components/PresentationInput";
import SelectableOptionsInput from "@/components/SelectableOptionsInput";
import Review from "@/components/Review";
import ReviewItem from "@/components/ReviewItem";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as ImageManipulator from "expo-image-manipulator";
import { useProfile } from "@/context/profile-context";
import { NOTIFICATION_TYPES } from "@/utils/consts";
import { Button } from "@/components/shared";
import { TextInput } from "react-native";

// ReviewPreview component for showing live preview with caption input
const ReviewPreview = ({
  values,
  spirits,
  types,
  photo,
  profile,
  control,
  watch,
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
  isSubmitting?: boolean;
  submissionMessage?: string;
}) => {
  const [isCaptionFocused, setIsCaptionFocused] = useState(false);
  const [previewCaption, setPreviewCaption] = useState("");
  const [inputCaption, setInputCaption] = useState("");

  // Create a mock review object for the preview - memoize to prevent re-creation
  const mockReview = useMemo(
    () =>
      ({
        id: "preview",
        user_id: profile?.id || "",
        image_url: photo || "",
        comment: previewCaption || "",
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
      } as any),
    [previewCaption, values, spirits, types, photo, profile]
  ); // Type assertion to bypass strict typing for preview

  // Mock handlers for the preview (they won't do anything)
  const mockHandlers = {
    onDelete: () => {},
    onShowLikes: () => {},
    onShowComments: () => {},
    onCommentAdded: () => {},
    onCommentDeleted: () => {},
  };

  const scrollViewRef = React.useRef<ScrollView>(null);

  const handleCaptionFocus = () => {
    setIsCaptionFocused(true);
    // Scroll to show the caption input when focused
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCaptionBlur = () => {
    setIsCaptionFocused(false);
    // Update the preview caption when user finishes typing
    setPreviewCaption(inputCaption);
    // Update the form value
    control._formValues.notes = inputCaption;
  };

  const openCaptionInput = () => {
    setIsCaptionFocused(true);
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Show loading state when submitting
  if (isSubmitting) {
    return (
      <View style={styles.submitLoadingContainer}>
        <ActivityIndicator size="large" color="#B6A3E2" />
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
              {inputCaption ? "Edit Caption" : "Add Caption"}
            </Text>
          </TouchableOpacity>
        ) : (
          <>
            <TextInput
              style={styles.captionInput}
              multiline={true}
              placeholder="Write a caption..."
              onChangeText={setInputCaption}
              value={inputCaption}
              maxLength={500}
              onFocus={handleCaptionFocus}
              onBlur={handleCaptionBlur}
              autoFocus={true}
            />
            <Text style={styles.characterCount}>
              {inputCaption?.length || 0}/500
            </Text>
            <TouchableOpacity
              style={styles.saveCaptionButton}
              onPress={handleCaptionBlur}
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
  const [photo, setPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [step, setStep] = useState(0);
  type Option = { id: number; name: string };

  const [types, setTypes] = useState<Option[]>([]);
  const [spirits, setSpirits] = useState<Option[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const opacity = useSharedValue(1);
  const router = useRouter();
  const { profile } = useProfile();

  const { control, handleSubmit, reset, trigger, formState, watch } = useForm({
    mode: "onChange",
    defaultValues: {
      location: null,
      spirit: "",
      type: "",
      taste: 0,
      presentation: 0,
      notes: "",
    },
  });
  const insets = useSafeAreaInsets();
  const watchedValues = watch();

  useEffect(() => {
    getTypes();
    getSpirits();
  }, []);

  interface Question {
    title: string;
    key?: "location" | "spirit" | "type" | "taste" | "presentation" | "notes";
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
    // For the preview step (last step), validate notes field
    if (step === questions.length - 1) {
      const isValid = await trigger("notes");
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
    if (step > 1) {
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

  const getTypes = async () => {
    const { data, error } = await supabase.from("types").select("*");
    if (error) {
      console.error("Error getting types:", error);
    }
    setTypes((data as Option[]) || []);
  };

  const getSpirits = async () => {
    const { data, error } = await supabase.from("spirits").select("*");
    if (error) {
      console.error("Error getting spirits:", error);
    }
    setSpirits((data as Option[]) || []);
  };

  const createReview = async (userId: string, imageUrl: string) => {
    const locationId = await getLocation(userId, watchedValues.location);
    if (locationId) {
      const newReview = {
        user_id: userId,
        location: locationId,
        spirit: watchedValues.spirit,
        type: watchedValues.type,
        taste: watchedValues.taste,
        presentation: watchedValues.presentation,
        comment: watchedValues.notes,
        image_url: imageUrl,
        state: 1,
      };
      const { data, error } = await supabase
        .from("reviews")
        .insert(newReview)
        .select("id")
        .single();

      if (error) {
        console.error("Error creating review:", error);
        return null;
      }

      return data.id;
    } else {
      console.log("Error getting location ID");
    }
  };

  const getLocation = async (userId: string, location: any) => {
    const { data, error } = await supabase
      .from("locations")
      .select("id")
      .eq("name", location.name)
      .eq("address", location.address)
      .maybeSingle();

    if (error) {
      console.error("Error getting location:", error);
      return null;
    } else if (data) {
      return data.id;
    }

    const newLocation = {
      created_by: userId,
      name: location.name,
      address: location.address,
      location: `POINT(${location.coordinates.longitude} ${location.coordinates.latitude})`,
    };

    const { data: locationData, error: locationError } = await supabase
      .from("locations")
      .insert(newLocation)
      .select("id")
      .single();

    if (locationError) {
      console.error("Error creating location:", locationError);
      return null;
    } else {
      return locationData.id;
    }
  };

  const handleUploadAndCreateReview = async (formData: any) => {
    try {
      setIsSubmitting(true);
      setSubmissionMessage("Uploading image...");
      const imageUrl = await uploadImage(profile.id);
      if (!imageUrl) {
        setSubmissionMessage("Failed to upload image.");
        setIsSubmitting(false);
        return;
      }

      setSubmissionMessage("Creating review...");
      const reviewId = await createReview(profile.id, imageUrl);
      if (!reviewId) {
        setSubmissionMessage("Failed to create review.");
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
          await supabase.from("notifications").insert({
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

      setStep(0);
      setPhoto(null);
      setIsReviewing(false);
      reset();
      router.navigate(`/profile`);
    } catch (error) {
      setSubmissionMessage("An error occurred.");
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
              animatedStyle,
            ]}
          >
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
                  {step > 1 && (
                    <Button
                      title="Back"
                      onPress={prevStep}
                      variant="outline"
                      size="medium"
                    />
                  )}
                </View>

                <TouchableOpacity
                  style={styles.quitButton}
                  onPress={cancelCapture}
                >
                  <Ionicons name="trash-outline" size={20} color="#ff4444" />
                </TouchableOpacity>

                <View style={styles.navRight}>
                  {step < questions.length - 1 ? (
                    <Button
                      title="Next"
                      onPress={nextStep}
                      variant="primary"
                      size="medium"
                    />
                  ) : (
                    <Button
                      title="Submit"
                      onPress={handleSubmit(handleUploadAndCreateReview)}
                      variant="primary"
                      size="medium"
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

// App design system constants
const COLORS = {
  primary: "#B6A3E2",
  background: "#fff",
  text: "#000",
  textSecondary: "#666",
  inputBackground: "#fafafa",
  overlay: "rgba(0,0,0,0.5)",
} as const;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingTop: 70,
    paddingHorizontal: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 15,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  previewContent: {
    paddingTop: 10, // Minimal padding for preview step
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
    height: 70,
  },
  navigation: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  navLeft: {
    flex: 1,
    alignItems: "flex-start",
  },
  navRight: {
    flex: 1,
    alignItems: "flex-end",
  },
  quitButton: {
    padding: 12,
    borderRadius: 25,
    backgroundColor: "rgba(255, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(255, 68, 68, 0.3)",
  },
  previewContainer: {
    flex: 1,
    width: "100%",
  },
  previewWrapper: {
    flex: 1,
    overflow: "hidden",
  },
  scaledReviewContainer: {
    transformOrigin: "top center",
  },
  captionInputContainer: {
    backgroundColor: COLORS.background,
    borderRadius: 12,
  },
  captionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    minHeight: 50,
  },
  captionButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  captionInput: {
    fontSize: 16,
    minHeight: 60,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    color: COLORS.text,
    textAlignVertical: "top",
  },
  characterCount: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 4,
  },
  hintText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
    fontStyle: "italic",
  },
  saveCaptionButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    backgroundColor: COLORS.primary,
    marginTop: 12,
    minHeight: 50,
  },
  saveCaptionButtonText: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  submitLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  submitLoadingText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.primary,
    marginTop: 20,
    textAlign: "center",
  },
});
