import { Stack } from "expo-router";
import { useTheme } from "@/theme";

/**
 * One layout serving every tab's stack via expo-router's array syntax, so the
 * same screen renders identically no matter which tab it was reached from
 * (the per-tab layouts had drifted apart). Screens are styled by route name
 * here rather than with <Stack.Screen> children because each group only
 * contains its own subset of routes.
 */

// Deep links straight to a nested screen still get a tab root underneath.
export const unstable_settings = {
  initialRouteName: "home",
  discover: { initialRouteName: "discover" },
  places: { initialRouteName: "places" },
  profile: { initialRouteName: "profile" },
};

// These roots draw their own chrome (the profile root keeps the stack
// header for its title + settings button).
const HEADERLESS = new Set(["home", "discover", "places", "terms", "delete-account"]);

const TITLES: Record<string, string> = {
  "users/[username]/followers": "Followers",
  "users/[username]/following": "Following",
  settings: "Settings",
  "edit-profile": "Edit Profile",
  "favorite-location": "Favorite Location",
  "place-info": "Information",
};

export default function SharedTabLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={({ route }) => ({
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
        headerShown: !HEADERLESS.has(route.name),
        ...(TITLES[route.name] ? { title: TITLES[route.name] } : {}),
      })}
    />
  );
}
