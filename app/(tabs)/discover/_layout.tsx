import { Stack } from "expo-router";

export default function DiscoverLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: "#000",
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
