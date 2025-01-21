import React, { useRef, useState } from "react";
import {
  Button,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Image,
} from "react-native";
import {
  CameraView,
  CameraMode,
  CameraType,
  useCameraPermissions,
} from "expo-camera";
import * as MediaLibrary from "expo-media-library";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { supabase } from "@/utils/supabase";
import { decode } from "base64-arraybuffer";
import { router } from "expo-router";

export default function App() {
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraMode, setCameraMode] = useState<CameraMode>("picture");
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>
          We need your permission to show the camera
        </Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const capturePhoto = async () => {
    if (cameraRef.current) {
      cameraRef.current
        .takePictureAsync({ quality: 1, exif: false, base64: true })
        .then((data) => {
          if (data?.base64) {
            setPhoto(data.base64);
            setIsReviewing(true);
          }
        });
    }
  };

  const cancelCapture = () => {
    setPhoto(null);
    setIsReviewing(false);
  };

  const uploadImage = async (userId: string) => {
    // Generate a random file name for the image
    const randomFileName = `${Math.random().toString(36).substring(2, 15)}.png`;

    // Upload image to Supabase Storage
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

    return data.path; // Return the image path if successful
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

  const handleUploadAndCreateReview = async (photo: any) => {
    const {
      data: { user: User },
    } = await supabase.auth.getUser();

    if (!User) return;

    // Step 1: Upload the image
    const imageUrl = await uploadImage(User.id);
    if (!imageUrl) return;

    // Step 2: Create the review
    const reviewId = await createReview(User.id, imageUrl);
    if (!reviewId) return;

    router.push({
      pathname: `/(auth)/review/review`,
      params: { id: reviewId },
    });
  };

  const openLibrary = async () => {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (permission.granted) {
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.photo,
      });
      console.log(media);
    }
  };

  return (
    <View style={styles.container}>
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
            <TouchableOpacity
              style={styles.libraryButton}
              onPress={openLibrary}
            >
              <Ionicons name="image" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </CameraView>
      ) : (
        <View style={styles.reviewContainer}>
          {photo && (
            <Image
              source={{ uri: `data:image/jpeg;base64,${photo}` }}
              style={styles.previewImage}
            />
          )}
          <View style={styles.reviewButtons}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleUploadAndCreateReview}
            >
              <Text style={styles.text}>Create Review</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={cancelCapture}>
              <Text style={styles.text}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

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
  libraryButton: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
    padding: 10,
    position: "absolute",
    right: 20,
  },
  reviewContainer: {
    flex: 1,
    width: "100%",
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
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 25,
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
});
