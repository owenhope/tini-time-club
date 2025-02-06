import React, { useRef, useState } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView, CameraMode, CameraType, useCameraPermissions } from "expo-camera";
import { FontAwesome6 } from "@expo/vector-icons";

interface CameraComponentProps {
  onCapture: (photo: string) => void;
}

const CameraComponent: React.FC<CameraComponentProps> = ({ onCapture }) => {
  const cameraRef = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>("back");
  const [cameraMode, setCameraMode] = useState<CameraMode>("picture");
  const [permission, requestPermission] = useCameraPermissions();

  const capturePhoto = async () => {
    if (cameraRef.current) {
      const data = await cameraRef.current.takePictureAsync({
        quality: 1,
        exif: false,
        base64: true,
      });
      if (data?.base64) {
        onCapture(data.base64);
      }
    }
  };

  return (
    <CameraView
      ref={cameraRef}
      style={styles.camera}
      facing={facing}
      mode={cameraMode}
    >
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.captureButton} onPress={capturePhoto}>
          <FontAwesome6 name="martini-glass" size={40} color="white" />
        </TouchableOpacity>
      </View>
    </CameraView>
  );
};

const styles = StyleSheet.create({
  camera: {
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
});

export default CameraComponent;