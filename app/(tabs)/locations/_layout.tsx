// app/locations/_layout.tsx
import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function LocationsLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Places",
          headerShown: false,
        }}
      />
      <Stack.Screen name="[location]" />
      <Stack.Screen name="users/[username]" options={{ headerShown: true }} />
      <Stack.Screen
        name="users/[username]/followers"
        options={{ title: "Followers" }}
      />
      <Stack.Screen
        name="users/[username]/following"
        options={{ title: "Following" }}
      />
    </Stack>
  );
}
