import { Stack } from "expo-router";
import { useTheme } from "@/theme";

export default function DiscoverLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.surface },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="users/[username]" />
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
