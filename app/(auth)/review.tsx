import React, { createElement, useEffect, useRef, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Image,
  TextInput,
} from "react-native";
import {
  CameraView,
  CameraMode,
  CameraType,
  useCameraPermissions,
} from "expo-camera";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import { decode } from "base64-arraybuffer";
import Animated, {
  runOnJS,
  useSharedValue,
  withTiming,
  useAnimatedStyle,
} from "react-native-reanimated";
import { BlurView } from "@react-native-community/blur";
import { useForm, Controller } from "react-hook-form";
import * as Location from "expo-location";
import { GooglePlacesAutocomplete } from "react-native-google-places-autocomplete";
import { AirbnbRating } from "react-native-ratings";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function App() {
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraMode, setCameraMode] = useState<CameraMode>("picture");
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [step, setStep] = useState(0);
  const opacity = useSharedValue(1);
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
  const watchedValues = watch(); // Watches all form fields

  interface Question {
    title: string;
    key?: "location" | "spirit" | "type" | "taste" | "presentation" | "notes";
    Component: React.ComponentType<any>;
  }

  const questions: Question[] = [
    { title: "Where are you?", key: "location", Component: LocationInput },
    { title: "Which Spirit?", key: "spirit", Component: SpiritInput },
    { title: "Which Type?", key: "type", Component: TypeInput },
    { title: "How does it taste?", key: "taste", Component: TasteInput },
    {
      title: "How is the presentation?",
      key: "presentation",
      Component: PresentationInput,
    },
    {
      title: "Additional notes or comments?",
      key: "notes",
      Component: NotesInput,
    },
    {
      title: "Review",
      Component: (props) => <Review values={watchedValues} {...props} />,
    },
  ];

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  const capturePhoto = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync({
        quality: 1,
        exif: false,
        base64: true,
      });
      if (data?.base64) {
        setPhoto(data.base64);
        setIsReviewing(true);
      }
    }
  };

  const cancelCapture = () => {
    setStep(0);
    setPhoto(null);
    setIsReviewing(false);
    reset();
  };

  const nextStep = async () => {
    const isValid = await trigger(questions[step].key as any); // Validate current step's field
    if (!isValid) return; // Stop navigation if validation fails

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
    const randomFileName = `${Math.random().toString(36).substring(2, 15)}.png`;

    const filePath = `review_images/${userId}/${randomFileName}`;
    if (!photo) {
      console.error("No photo to upload");
      return null;
    }

    const { data, error } = await supabase.storage
      .from("review_images")
      .upload(filePath, decode(photo), {
        contentType: "image/png",
      });

    if (error) {
      console.error("Error uploading image:", error);
      return null;
    }

    return data.path;
  };

  const createReview = async (userId: string, imageUrl: string) => {
    const newReview = {
      user_id: userId,
      image_url: imageUrl,
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
  };

  const handleUploadAndCreateReview = async (formData: any) => {
    const {
      data: { user: User },
    } = await supabase.auth.getUser();

    if (!User) return;

    const imageUrl = await uploadImage(User.id);
    if (!imageUrl) return;

    const reviewId = await createReview(User.id, imageUrl);
    if (!reviewId) return;

    console.log("Review data:", formData);
  };

  return (
    <TouchableWithoutFeedback
      style={[styles.container, { paddingTop: insets.top }]}
      onPress={Keyboard.dismiss}
    >
      {!isReviewing ? (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          mode={cameraMode}
        >
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.captureButton}
              onPress={capturePhoto}
            >
              <FontAwesome6 name="martini-glass" size={40} color="white" />
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.reviewContainer}>
          <BlurView
            style={styles.reviewContainer}
            blurType="dark"
            blurAmount={5}
            reducedTransparencyFallbackColor="white"
          >
            {photo && (
              <Image
                source={{ uri: `data:image/jpeg;base64,${photo}` }}
                style={styles.previewImage}
              />
            )}
          </BlurView>
          <TouchableOpacity style={styles.cancelButton} onPress={cancelCapture}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <Animated.View style={[styles.overlay, animatedStyle]}>
            <Text style={styles.stepText}>{questions[step].title}</Text>
            {questions[step].Component &&
              createElement(questions[step].Component, {
                control,
                ...formState,
              })}
          </Animated.View>
          <View style={styles.reviewButtons}>
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
          </View>
        </View>
      )}
    </TouchableWithoutFeedback>
  );
}

const LocationInput = ({ control }: { control: any }) => {
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null
  );

  useEffect(() => {
    async function getCurrentLocation() {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setLocation(location);
    }

    getCurrentLocation();
  }, []);

  const query = {
    key: "AIzaSyC1LKk6V5h4J_AxLq9vwbZcS__BJ-fcoH8",
    language: "en",
    types: "restaurant|cafe|bar",
    location: location
      ? `${location.latitude},${location.longitude}`
      : undefined,
    radius: location ? 5000 : undefined, // Optional: Set a search radius in meters if location exists
  };

  return (
    <Controller
      control={control}
      name="location"
      rules={{ required: true }}
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <GooglePlacesAutocomplete
            placeholder="Search Restaurants, Cafes, or Bars"
            textInputProps={{
              placeholderTextColor: "#AAA",
              returnKeyType: "search",
            }}
            fetchDetails={true}
            minLength={2}
            onPress={(data, details = null) => {
              const locationData = {
                name: data.structured_formatting.main_text,
                address: data.description,
                coordinates: details
                  ? {
                      latitude: details.geometry.location.lat,
                      longitude: details.geometry.location.lng,
                    }
                  : null,
              };
              onChange(locationData); // Save to form state
            }}
            query={query}
            styles={{
              container: { flex: 0, zIndex: 1 },
              textInput: {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                height: 44,
                borderRadius: 5,
                paddingVertical: 5,
                paddingHorizontal: 10,
                fontSize: 18,
                flex: 1,
                color: "#FFF",
              },
              row: {
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                paddingHorizontal: 10.5,
              },
              description: {
                color: "#FFF",
                fontSize: 14,
              },
              separator: {
                display: "none",
              },
              poweredContainer: {
                display: "none",
              },
            }}
          />
        </View>
      )}
    />
  );
};

const SpiritInput = ({ control }: { control: any }) => (
  <Controller
    control={control}
    name="spirit"
    rules={{
      required: true,
    }}
    defaultValue="" // Default to no selection
    render={({ field: { onChange, value } }) => (
      <View style={styles.inputContainer}>
        <View style={styles.buttonGroup}>
          {/* GIN Button */}
          <TouchableOpacity
            style={[
              styles.optionButton,
              value === "GIN" && styles.selectedButton, // Highlight if selected
            ]}
            onPress={() => onChange("GIN")} // Update form value
          >
            <Text
              style={[
                styles.buttonText,
                value === "GIN" && styles.selectedButtonText, // Highlight text if selected
              ]}
            >
              GIN
            </Text>
          </TouchableOpacity>

          {/* VODKA Button */}
          <TouchableOpacity
            style={[
              styles.optionButton,
              value === "VODKA" && styles.selectedButton, // Highlight if selected
            ]}
            onPress={() => onChange("VODKA")} // Update form value
          >
            <Text
              style={[
                styles.buttonText,
                value === "VODKA" && styles.selectedButtonText, // Highlight text if selected
              ]}
            >
              VODKA
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
  />
);

const TypeInput = ({ control }: { control: any }) => (
  <Controller
    control={control}
    name="type"
    rules={{
      required: true,
    }}
    defaultValue="" // Default to no selection
    render={({ field: { onChange, value } }) => (
      <View style={styles.inputContainer}>
        <View style={styles.buttonGroup}>
          <TouchableOpacity
            style={[
              styles.optionButton,
              value === "DIRTY" && styles.selectedButton, // Highlight if selected
            ]}
            onPress={() => onChange("DIRTY")} // Update form value
          >
            <Text
              style={[
                styles.buttonText,
                value === "DIRTY" && styles.selectedButtonText, // Highlight text if selected
              ]}
            >
              Dirty
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.optionButton,
              value === "TWIST" && styles.selectedButton, // Highlight if selected
            ]}
            onPress={() => onChange("TWIST")} // Update form value
          >
            <Text
              style={[
                styles.buttonText,
                value === "TWIST" && styles.selectedButtonText, // Highlight text if selected
              ]}
            >
              Twist
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    )}
  />
);

const TasteInput = ({ control }: { control: any }) => {
  const OLIVE_IMAGE = require("@/assets/images/olive_transparent.png");
  return (
    <Controller
      control={control}
      name="taste"
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <AirbnbRating
            starImage={OLIVE_IMAGE}
            selectedColor="#c3eb78"
            count={5}
            size={40}
            starContainerStyle={{ padding: 25 }}
            reviewSize={24}
            reviewColor="#c3eb78"
            defaultRating={value}
            reviews={[
              "Absolutely undrinkable",
              "Meh, forgettable",
              "Decent attempt",
              "Quite enjoyable",
              "Utter perfection",
            ]}
            onFinishRating={onChange}
          />
        </View>
      )}
    />
  );
};

const PresentationInput = ({ control }: { control: any }) => {
  const MARTINI_IMAGE = require("@/assets/images/martini_transparent.png");
  return (
    <Controller
      control={control}
      name="presentation"
      render={({ field: { onChange, value } }) => (
        <View style={styles.inputContainer}>
          <AirbnbRating
            starImage={MARTINI_IMAGE}
            selectedColor="#f3ffc6"
            count={5}
            size={40}
            starContainerStyle={{ padding: 25 }}
            reviewSize={24}
            defaultRating={value}
            reviewColor="#f3ffc6"
            reviews={[
              "Messy disaster",
              "Lacking effort",
              "Acceptably plain",
              "Elegantly simple",
              "Artistic masterpiece",
            ]}
            onFinishRating={onChange}
          />
        </View>
      )}
    />
  );
};

const NotesInput = ({ control }: { control: any }) => (
  <Controller
    control={control}
    name="notes"
    render={({ field: { onChange, value } }) => (
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textarea}
          multiline={true}
          onChangeText={onChange}
          value={value}
        />
      </View>
    )}
  />
);

interface ReviewValues {
  location?: { name: string; address: string };
  spirit?: string;
  type?: string;
  taste?: number;
  presentation?: number;
  notes?: string;
}

const Review = ({ values }: { values: ReviewValues }) => {
  const ReviewRating = ({ value, label }: { value: number; label: string }) => {
    console.log(label);
    const MARTINI_IMAGE = require("@/assets/images/martini_transparent.png");
    const OLIVE_IMAGE = require("@/assets/images/olive_transparent.png");
    const OLIVE_COLOR = "#c3eb78";
    const MARTINI_COLOR = "#f3ffc6";
    return (
      <AirbnbRating
        starImage={label === "taste" ? OLIVE_IMAGE : MARTINI_IMAGE}
        selectedColor={label === "taste" ? OLIVE_COLOR : MARTINI_COLOR}
        count={5}
        size={20}
        reviewSize={16}
        showRating={false}
        ratingContainerStyle={{ alignItems: "flex-start" }}
        defaultRating={value}
      />
    );
  };

  return (
    <View style={styles.inputContainer}>
      {Object.entries(values || {}).map(([key, value]) => {
        if (key === "location" && value?.name && value?.address) {
          return (
            <View key={key} style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>{key}:</Text>
              <Text style={styles.reviewValue}>
                {value.name}, {value.address}
              </Text>
            </View>
          );
        }

        if (["spirit", "type", "notes"].includes(key)) {
          return (
            <View key={key} style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>{key}:</Text>
              <Text style={styles.reviewValue}>{value}</Text>
            </View>
          );
        }

        if (key === "presentation" || key === "taste") {
          return (
            <View key={key} style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>{key}:</Text>
              <ReviewRating value={value} label={key} />
            </View>
          );
        }

        return null;
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    textAlign: "center",
    paddingBottom: 10,
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  previewImage: {
    flex: 1,
    width: "100%",
  },
  cancelButton: {
    borderRadius: 25,
    padding: 10,
    position: "absolute",
    right: 10,
    top: 50,
    zIndex: 100,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    position: "absolute",
    bottom: 20,
    width: "100%",
    paddingHorizontal: 20,
  },
  captureButton: {
    padding: 20,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
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
  reviewButtons: {
    flexDirection: "row",
    justifyContent: "center",
    position: "absolute",
    bottom: 20,
    width: "100%",
    paddingHorizontal: 20,
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
  inputContainer: {
    marginVertical: 20,
    width: "100%",
  },
  input: {
    fontSize: 18,
    padding: 10,
    borderWidth: 1,
    borderColor: "gray",
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  textarea: {
    fontSize: 18,
    minHeight: 100,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    color: "#FFF",
  },
  errorText: {
    color: "#FFF",
    fontSize: 14,
    marginTop: 5,
  },
  buttonGroup: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
  },
  optionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "transparent", // Default button background
    borderWidth: 1,
    borderColor: "#ccc",
    width: 100,
  },
  selectedButton: {
    backgroundColor: "olive", // Highlight color for selected button
    borderColor: "olive",
  },
  buttonText: {
    fontSize: 18,
    color: "#FFF", // Default text color
    textAlign: "center",
  },
  selectedButtonText: {
    color: "#fff", // Highlight text color for selected button
  },
  reviewItem: {
    marginBottom: 10,
    gap: 5,
  },
  reviewLabel: {
    textTransform: "capitalize",
    fontWeight: "bold",
    fontSize: 16,
    color: "white",
  },
  reviewValue: {
    fontSize: 14,
    color: "white",
  },
  formStateContainer: {
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
    width: "100%",
  },
  formStateText: {
    fontSize: 12,
    color: "white",
    textAlign: "left",
  },
});
