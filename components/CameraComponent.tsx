import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { useEffect, useRef, useState } from "react";
import {
  Button,
  Pressable,
  Text,
  View,
  Image,
  Alert,
  Linking,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AppHeader, { type HeaderAction } from "@/components/nav/AppHeader";
import { makeStyles, useTheme } from "@/theme";
import { reportError } from "@/utils/log";

interface CameraComponentProps {
  onCapture: (photo: string) => void;
  /** Leave the composer. The camera is the first step of a presented flow. */
  onClose?: () => void;
  /** Matches the step metadata rendered under the other review-flow headers. */
  headerBelow?: React.ReactNode;
  title?: string;
  closeAccessibilityLabel?: string;
  closeIcon?: keyof typeof Ionicons.glyphMap;
}

export default function CameraComponent({
  onCapture,
  onClose,
  headerBelow,
  title = "Capture",
  closeAccessibilityLabel = "Discard review",
  closeIcon = "close-outline",
}: CameraComponentProps) {
  const styles = useStyles();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const pickerOpenRef = useRef(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [facing, setFacing] = useState<CameraType>("back");

  useEffect(() => {
    if (!permission) return;
    if (!permission.granted) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  if (!permission) {
    return null;
  }

  if (!permission.granted) {
    // Once the user has denied and iOS marks the permission non-requestable,
    // requestPermission() silently no-ops — Settings is the only way back, so
    // send them there instead of leaving the Review tab permanently unusable.
    const mustUseSettings = !permission.canAskAgain;

    return (
      <SafeAreaView style={styles.permissionSafeArea} edges={["top", "bottom"]}>
        <View style={styles.permissionContent}>
          <Ionicons
            name="camera-outline"
            size={38}
            color={colors.textOnImage}
          />
          <Text style={styles.permissionTitle}>Camera Access</Text>
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
      </SafeAreaView>
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
      reportError("Error taking picture:", error);
      Alert.alert("Error", "An error occurred while taking the picture.");
    }
  };

  // Toggle between the front and back cameras.
  const toggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  // Function to pick an image from the user's photo library.
  const pickImage = async () => {
    if (pickerOpenRef.current) return;

    pickerOpenRef.current = true;

    try {
      const mediaPermission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!mediaPermission.granted) {
        Alert.alert(
          "Permission Required",
          "Permission to access your photo library is required!"
        );
        return;
      }

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
      reportError("Error picking image:", error);
      Alert.alert("Error", "An error occurred while picking the image.");
    } finally {
      pickerOpenRef.current = false;
    }
  };

  const libraryAction: HeaderAction = {
    icon: "images-outline",
    onPress: pickImage,
    accessibilityLabel: "Choose a photo from your library",
  };
  const headerActions: HeaderAction[] = [
    libraryAction,
    ...(onClose
      ? [
          {
            icon: closeIcon,
            onPress: onClose,
            accessibilityLabel: closeAccessibilityLabel,
          },
        ]
      : []),
  ];

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
      <View style={styles.cameraStage}>
        <CameraView
          style={StyleSheet.absoluteFill}
          ref={cameraRef}
          mode="picture"
          facing={facing}
          mute={false}
          responsiveOrientationWhenOrientationLocked
        />

        <View
          pointerEvents="box-none"
          style={[
            styles.cameraControls,
            {
              paddingTop: 16,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          <View style={styles.cameraTopOverlay}>
            <Pressable
              style={styles.controlButton}
              onPress={toggleFacing}
              accessibilityRole="button"
              accessibilityLabel="Switch camera"
            >
              <Ionicons
                name="camera-reverse-outline"
                size={20}
                color={colors.onInk}
              />
            </Pressable>
          </View>

          <Pressable
            style={styles.captureButton}
            onPress={takePicture}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
          >
            {({ pressed }) => (
              <View
                style={[styles.shutterBtn, pressed && styles.shutterPressed]}
              >
                <View style={styles.shutterBtnInner} />
              </View>
            )}
          </Pressable>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {capturedUri ? (
        renderPreview()
      ) : (
        <>
          <AppHeader
            variant="large"
            title={title}
            actions={headerActions}
            below={headerBelow}
          />
          {renderCamera()}
        </>
      )}
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
  permissionSafeArea: {
    flex: 1,
    backgroundColor: "#000",
  },
  permissionContent: {
    flex: 1,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    paddingHorizontal: t.spacing.xxl,
    gap: t.spacing.md,
  },
  permissionTitle: {
    ...t.typography.title,
    color: t.colors.textOnImage,
  },
  infoText: {
    ...t.typography.body,
    textAlign: "center" as const,
    marginBottom: t.spacing.sm,
    color: t.colors.textOnImage,
  },
  cameraStage: {
    flex: 1,
    width: "100%" as const,
  },
  cameraControls: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    justifyContent: "space-between" as const,
    paddingHorizontal: t.spacing.gutter,
  },
  cameraTopOverlay: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "flex-end" as const,
  },
  controlButton: {
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    borderRadius: t.radius.pill,
    backgroundColor: t.colors.ratingTrackOnInk,
    borderWidth: 0,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
  },
  captureButton: {
    alignSelf: "center" as const,
    width: 96,
    height: 96,
    alignItems: "center" as const,
    justifyContent: "center" as const,
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
  shutterPressed: {
    opacity: 0.6,
    transform: [{ scale: 0.96 }],
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
