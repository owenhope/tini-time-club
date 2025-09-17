import React, { createElement, useEffect, useState } from "react";
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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import AnimatedReanimated, {
  runOnJS,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { BlurView } from "@react-native-community/blur";
import { useForm } from "react-hook-form";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import CameraComponent from "@/components/CameraComponent";
import LocationInput from "@/components/LocationInput";
import TasteInput from "@/components/TasteInput";
import PresentationInput from "@/components/PresentationInput";
import NotesInput from "@/components/NotesInput";
import SpiritInput from "@/components/SpiritInput";
import TypeInput from "@/components/TypeInput";
import Review from "@/components/Review";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import * as ImageManipulator from "expo-image-manipulator";
import { useProfile } from "@/context/profile-context";
import { NOTIFICATION_TYPES } from "@/utils/consts";

export default function App() {
  const [photo, setPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [step, setStep] = useState(0);
  const [types, setTypes] = useState<any[]>([]);
  const [spirits, setSpirits] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionMessage, setSubmissionMessage] = useState("");
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
    { title: "Where are you?", key: "location", Component: LocationInput },
    {
      title: "Which Spirit?",
      key: "spirit",
      Component: () => <SpiritInput control={control} spirits={spirits} />,
    },
    {
      title: "Which Type?",
      key: "type",
      Component: () => <TypeInput control={control} types={types} />,
    },
    {
      title: "Presentation Rating",
      key: "presentation",
      Component: PresentationInput,
    },
    { title: "Taste Rating", key: "taste", Component: TasteInput },
    {
      title: "Additional notes or comments?",
      key: "notes",
      Component: NotesInput,
    },
    {
      title: "Review",
      Component: (props) => (
        <Review
          values={watchedValues}
          spirits={spirits}
          types={types}
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
    const isValid = await trigger(questions[step].key as any);
    if (!isValid) return;

    if (step < questions.length - 1) {
      opacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(setStep)(step + 1);
        opacity.value = withTiming(1, { duration: 300 });
      });
    }
  };

  const prevStep = () => {
    if (step > 1) {
      opacity.value = withTiming(0, { duration: 300 }, () => {
        runOnJS(setStep)(step - 1);
        opacity.value = withTiming(1, { duration: 300 });
      });
    }
  };

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
    setTypes(data || []);
  };

  const getSpirits = async () => {
    const { data, error } = await supabase.from("spirits").select("*");
    if (error) {
      console.error("Error getting spirits:", error);
    }
    setSpirits(data || []);
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
        <View style={styles.reviewContainer}>
          <BlurView
            style={styles.reviewContainer}
            blurType="dark"
            blurAmount={5}
            reducedTransparencyFallbackColor="white"
          >
            {photo && (
              <Image source={{ uri: photo }} style={styles.previewImage} />
            )}
          </BlurView>
          <TouchableOpacity style={styles.cancelButton} onPress={cancelCapture}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <AnimatedReanimated.View style={[styles.overlay, animatedStyle]}>
            <Text style={styles.stepText}>{questions[step].title}</Text>
            {questions[step].Component &&
              createElement(questions[step].Component, {
                control,
                ...formState,
              })}
          </AnimatedReanimated.View>
          <View style={styles.bottomContainer}>
            <Animated.View
              style={[styles.reviewButtons, { opacity: isSubmitting ? 0 : 1 }]}
            >
              {step > 1 && (
                <TouchableOpacity style={styles.button} onPress={prevStep}>
                  <Text style={styles.text}>Back</Text>
                </TouchableOpacity>
              )}
              {step < questions.length - 1 ? (
                <TouchableOpacity style={styles.button} onPress={nextStep}>
                  <Text style={styles.text}>Next</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleSubmit(handleUploadAndCreateReview)}
                >
                  <Text style={styles.text}>Submit</Text>
                </TouchableOpacity>
              )}
            </Animated.View>
            <Animated.View
              style={[
                styles.submitStatusContainer,
                { opacity: isSubmitting ? 1 : 0 },
              ]}
            >
              <ActivityIndicator size="large" color="white" />
              <Text style={styles.submitStatusText}>{submissionMessage}</Text>
            </Animated.View>
          </View>
        </View>
      )}
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  reviewContainer: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  stepText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  bottomContainer: {
    position: "absolute",
    bottom: 20,
    width: "100%",
    paddingHorizontal: 20,
  },
  reviewButtons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  submitStatusContainer: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
  },
  button: {
    marginHorizontal: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 25,
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  cancelButton: {
    borderRadius: 25,
    padding: 10,
    position: "absolute",
    right: 10,
    top: 50,
    zIndex: 100,
  },
  previewImage: {
    flex: 1,
    width: "100%",
  },
  submitStatusText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
    marginTop: 10,
    textAlign: "center",
  },
});
