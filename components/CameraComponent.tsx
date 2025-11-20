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
  StyleSheet,
  Text,
  View,
  Image,
  Alert,
  Animated,
} from "react-native";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

interface CameraComponentProps {
  onCapture: (photo: string) => void;
}

export default function CameraComponent({ onCapture }: CameraComponentProps) {
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
    return (
      <View style={styles.container}>
        <Text style={styles.infoText}>
          We need your permission to use the camera.
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  // Function to take a picture using the camera.
  const takePicture = async () => {
    try {
      const photo = await cameraRef.current?.takePictureAsync({
        quality: 1,
        base64: true,
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
        base64: true,
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
        <Pressable style={styles.toggleButton} onPress={toggleFacing}>
          <FontAwesome6 name="camera-rotate" size={32} color="white" />
        </Pressable>

        {/* Pick image button with CTA in top right */}
        <View style={styles.imagePickerContainer}>
          <Pressable style={styles.pickImageButton} onPress={pickImage}>
            <FontAwesome6 name="image" size={32} color="white" />
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
        <Pressable style={styles.captureButton} onPress={takePicture}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  infoText: {
    textAlign: "center",
    marginBottom: 10,
    color: "#fff",
  },
  camera: {
    flex: 1,
    width: "100%",
  },
  toggleButton: {
    position: "absolute",
    top: 80,
    left: 20,
  },
  captureButton: {
    position: "absolute",
    bottom: 0,
    left: "50%",
    transform: [{ translateX: -42.5 }, { translateY: -20 }],
  },
  imagePickerContainer: {
    position: "absolute",
    top: 80,
    right: 20,
    alignItems: "flex-end",
  },
  pickImageButton: {
    marginBottom: 8,
  },
  ctaBanner: {
    backgroundColor: "#B6A3E2",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    minWidth: 170,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  ctaText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",

    textAlign: "center",
    letterSpacing: 0.2,
  },
  ctaSubtext: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.85)",
    marginTop: 2,
    textAlign: "center",
    fontWeight: "400",
  },
  shutterBtn: {
    backgroundColor: "transparent",
    borderWidth: 5,
    borderColor: "white",
    width: 85,
    height: 85,
    borderRadius: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  shutterBtnInner: {
    width: 70,
    height: 70,
    borderRadius: 50,
    backgroundColor: "#FFF",
  },
  previewContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  previewImage: {
    width: 300,
    aspectRatio: 1,
    marginBottom: 20,
  },
});
