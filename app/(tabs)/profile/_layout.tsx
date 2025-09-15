// app/profile/_layout.tsx
import { Stack } from "expo-router";

export default function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: "#000",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="followers"
        options={{
          title: "Followers",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="terms"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="delete-account"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
