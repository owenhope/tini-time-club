import { Stack } from "expo-router";
import AppHeader from "@/components/nav/AppHeader";
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

/**
 * These routes draw their own chrome: the four tab roots wear header A, and
 * the two detail screens wear header C inside their own scrolling content.
 * Everything else is a pushed list or a settings page, which is header B —
 * and B is what the `header` renderer below hands them.
 */
const HEADERLESS = new Set([
  "home",
  "discover",
  "places",
  "profile",
  "places/[place]",
  "users/[username]",
]);

const TITLES: Record<string, string> = {
  "users/[username]/followers": "Followers",
  "users/[username]/following": "Following",
  settings: "Settings",
  "edit-profile": "Edit Profile",
  "favorite-location": "Favorite Location",
  "place-info": "Information",
  terms: "Terms of Service",
  "delete-account": "Delete Account",
};

export default function SharedTabLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={({ route }) => ({
        contentStyle: { backgroundColor: colors.background },
        headerShown: !HEADERLESS.has(route.name),
        ...(TITLES[route.name] ? { title: TITLES[route.name] } : {}),
        // Variant B for every pushed screen, in place of the platform bar —
        // the outlined circles and the centred sentence-case title are the
        // drawing's, and the native header cannot draw either.
        header: ({ options, navigation, back }) => (
          <AppHeader
            variant="compact"
            title={options.title ?? ""}
            onBack={back ? navigation.goBack : undefined}
          />
        ),
      })}
    />
  );
}
