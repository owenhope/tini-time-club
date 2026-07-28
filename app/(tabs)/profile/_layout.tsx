// app/profile/_layout.tsx
import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function ProfileLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: colors.text,
        headerStyle: {
          backgroundColor: colors.surface,
        },
        contentStyle: {
          backgroundColor: colors.background,
        },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen
        name="follow-list"
        options={{
          title: "Follow List",
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Settings",
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
      <Stack.Screen
        name="edit-profile"
        options={{
          title: "Edit Profile",
        }}
      />
      <Stack.Screen name="users/[username]" options={{ headerShown: true }} />
      <Stack.Screen
        name="users/[username]/followers"
        options={{ title: "Followers" }}
      />
      <Stack.Screen
        name="users/[username]/following"
        options={{ title: "Following" }}
      />
      <Stack.Screen name="locations/[location]" />
    </Stack>
  );
}
