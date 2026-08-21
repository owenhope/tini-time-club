import { useEffect, useRef } from "react";
import { Stack, usePathname } from "expo-router";
import AppHeader from "@/components/nav/AppHeader";
import { useTheme } from "@/theme";
import { useProfile } from "@/context/profile-context";
import { useMembership } from "@/context/membership-context";
import { getVisitorGatedRouteIntent } from "@/utils/membership";

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
  profile: { initialRouteName: "profile" },
};

/**
 * These routes draw their own chrome: the three tab roots wear header A, and
 * the two detail screens wear header C inside their own scrolling content.
 * Everything else is a pushed list or a settings page, which is header B —
 * and B is what the `header` renderer below hands them.
 */
const HEADERLESS = new Set([
  "home",
  "discover",
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
  notifications: "Notifications",
  activity: "Activity",
  "place-info": "Information",
  terms: "Terms of Service",
  "delete-account": "Delete Account",
};

export default function SharedTabLayout() {
  const { colors } = useTheme();
  const { profile, loading } = useProfile();
  const { openMembership } = useMembership();
  const pathname = usePathname();
  const visitorIntent = getVisitorGatedRouteIntent(pathname);
  const promptedPath = useRef<string | null>(null);
  const memberWasOnProtectedPath = useRef(false);

  useEffect(() => {
    if (!visitorIntent) {
      promptedPath.current = null;
      memberWasOnProtectedPath.current = false;
      return;
    }
    if (profile) {
      memberWasOnProtectedPath.current = true;
      return;
    }
    if (!loading && !profile && promptedPath.current !== pathname) {
      // SIGNED_OUT clears ProfileContext before the root navigator replaces a
      // member-only Settings route with Home. That one transition is not a
      // visitor asking to enter Settings, so do not put a membership sheet on
      // top of the destination. The ref resets once Home becomes current.
      if (memberWasOnProtectedPath.current) return;
      promptedPath.current = pathname;
      openMembership(visitorIntent);
    }
  }, [loading, openMembership, pathname, profile, visitorIntent]);

  // Keep member-only children from mounting before the contextual CTA. This
  // prevents activity/profile queries and settings writes from firing during
  // the navigation frame in which a visitor reaches a protected deep link.
  if (loading || (!profile && visitorIntent)) return null;

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
            ground={route.name === "activity" ? "ink" : undefined}
            title={options.title ?? ""}
            onBack={back ? navigation.goBack : undefined}
          />
        ),
      })}
    />
  );
}
