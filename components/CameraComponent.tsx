import {
  CameraMode,
  CameraType,
  CameraView,
  useCameraPermissions,
} from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Pressable,
  Text,
  View,
  Image,
  Alert,
  Animated,
  Linking,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { makeStyles, useTheme } from "@/theme";

interface CameraComponentProps {
  onCapture: (photo: string) => void;
}

export default function CameraComponent({ onCapture }: CameraComponentProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [mode, setMode] = useState<CameraMode>("picture");
  const [facing, setFacing] = useState<CameraType>("back");
  const [showCta, setShowCta] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission]);

  // Auto-dismiss CTA after 5 seconds with fade-out
  useEffect(() => {
    if (showCta) {
      const timer = setTimeout(() => {
        // Fade out animation
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          setShowCta(false);
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showCta, fadeAnim]);

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    // Once the user has denied and iOS marks the permission non-requestable,
    // requestPermission() silently no-ops — Settings is the only way back, so
    // send them there instead of leaving the Review tab permanently unusable.
    const mustUseSettings = !permission.canAskAgain;

    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>
          {mustUseSettings
            ? "Camera access is turned off. Enable it in Settings to share a Martini."
            : "We need your permission to use the camera."}
        </Text>
        <Button
          onPress={
            mustUseSettings ? () => Linking.openSettings() : requestPermission
          }
          title={mustUseSettings ? "Open Settings" : "Grant Permission"}
        />
      </View>
    );
  }

  // Function to take a picture using the camera.
  const takePicture = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 1,
        // base64 is not read anywhere; requesting it doubles peak memory and
        // adds noticeable shutter lag. The uri is all the review flow needs.
        base64: false,
        exif: false,
      });
      if (photo && photo.uri) {
        onCapture(photo.uri);
        setCapturedUri(photo.uri); // For preview purposes
      }
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "An error occurred while taking the picture.");
    }
  };

  // Toggle between the front and back cameras.
  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  // Function to pick an image from the user's photo library.
  const pickImage = async () => {
    const mediaPermission =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!mediaPermission.granted) {
      Alert.alert(
        "Permission Required",
        "Permission to access your photo library is required!"
      );
      return;
    }
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: false,
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        if (result.assets[0].uri) {
          onCapture(result.assets[0].uri);
          setCapturedUri(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "An error occurred while picking the image.");
    }
  };

  // Render a preview of the captured or selected image.
  const renderPreview = () => {
    return (
      <View style={styles.previewContainer}>
        <Image source={{ uri: capturedUri! }} style={styles.previewImage} />
        <Button
          title="Take another picture"
          onPress={() => setCapturedUri(null)}
        />
      </View>
    );
  };

  // Render the camera view along with controls.
  const renderCamera = () => {
    return (
      <CameraView
        style={styles.camera}
        ref={cameraRef}
        mode={mode}
        facing={facing}
        mute={false}
        responsiveOrientationWhenOrientationLocked
      >
        {/* Toggle camera facing button in top left */}
        <Pressable
          style={styles.toggleButton}
          onPress={toggleFacing}
          accessibilityRole="button"
          accessibilityLabel="Switch camera"
        >
          <FontAwesome6
            name="camera-rotate"
            size={32}
            color={colors.textOnImage}
          />
        </Pressable>

        {/* Pick image button with CTA in top right */}
        <View style={styles.imagePickerContainer}>
          <Pressable
            style={styles.pickImageButton}
            onPress={pickImage}
            accessibilityRole="button"
            accessibilityLabel="Choose a photo from your library"
          >
            <FontAwesome6 name="image" size={32} color={colors.textOnImage} />
          </Pressable>
          {showCta && (
            <Animated.View style={[styles.ctaBanner, { opacity: fadeAnim }]}>
              <Text style={styles.ctaText}>Upload from camera roll</Text>
              <Text style={styles.ctaSubtext}>
                Post reviews from previous dates
              </Text>
            </Animated.View>
          )}
        </View>

        {/* Capture button in the center */}
        <Pressable
          style={styles.captureButton}
          onPress={takePicture}
          accessibilityRole="button"
          accessibilityLabel="Take photo"
        >
          {({ pressed }) => (
            <View style={[styles.shutterBtn, { opacity: pressed ? 0.5 : 1 }]}>
              <View style={styles.shutterBtnInner} />
            </View>
          )}
        </Pressable>
      </CameraView>
    );
  };

  return (
    <View style={styles.container}>
      {capturedUri ? renderPreview() : renderCamera()}
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    // Deliberately fixed: this is the frame behind a live camera feed, which
    // reads as black in both themes.
    backgroundColor: "#000",
  },
  infoText: {
    textAlign: "center" as const,
    marginBottom: t.spacing.sm + 2,
    color: t.colors.textOnImage,
  },
  camera: {
    flex: 1,
    width: "100%" as const,
  },
  toggleButton: {
    position: "absolute" as const,
    top: 80,
    left: t.spacing.xl - 4,
  },
  captureButton: {
    position: "absolute" as const,
    bottom: 0,
    left: "50%" as const,
    transform: [{ translateX: -42.5 }, { translateY: -20 }],
  },
  imagePickerContainer: {
    position: "absolute" as const,
    top: 80,
    right: t.spacing.xl - 4,
    alignItems: "flex-end" as const,
  },
  pickImageButton: {
    marginBottom: t.spacing.sm,
  },
  ctaBanner: {
    backgroundColor: t.colors.accent,
    borderRadius: t.radius.md,
    paddingHorizontal: t.spacing.lg,
    paddingVertical: t.spacing.md,
    alignItems: "center" as const,
    minWidth: 170,
    ...t.elevation.raised,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: t.colors.onAccent,

    textAlign: "center" as const,
    letterSpacing: 0.2,
  },
  ctaSubtext: {
    fontSize: 12,
    color: t.colors.onAccent,
    opacity: 0.85,
    marginTop: 2,
    textAlign: "center" as const,
    fontWeight: "400" as const,
  },
  shutterBtn: {
    backgroundColor: "transparent",
    borderWidth: 5,
    borderColor: t.colors.textOnImage,
    width: 85,
    height: 85,
    borderRadius: 45,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  shutterBtnInner: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: t.colors.textOnImage,
  },
  previewContainer: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  previewImage: {
    width: 300,
    aspectRatio: 1,
    marginBottom: t.spacing.xl - 4,
  },
}));
