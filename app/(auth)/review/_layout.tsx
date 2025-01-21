// app/review/_layout.tsx
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

const ReviewLayout = () => {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#FFF" },
        headerTintColor: "#000",
        headerShadowVisible: false,
      }}
    >
      {/* Camera Screen */}
      <Stack.Screen
        name="camera"
        options={{
          title: "Camera",
          headerShown: false,
        }}
      />

      {/* Review Screen */}
      <Stack.Screen
        name="review"
        options={{
          title: "Review",
          headerLeft: () => (
            <Ionicons name="clipboard-outline" size={24} color="#000" />
          ),
        }}
      />
    </Stack>
  );
};

export default ReviewLayout;
