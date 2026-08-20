import "react-native-get-random-values";
import { Sentry } from "@/utils/sentry";
import { useEffect, useState, useRef } from "react";
import {
  Stack,
  useRouter,
  usePathname,
  useRootNavigationState,
  type ErrorBoundaryProps,
} from "expo-router";
import { log, reportError, warn } from "@/utils/log";
import { supabase } from "@/utils/supabase";
import imageCache from "@/utils/imageCache";
import authCache from "@/utils/authCache";
import {
  Alert,
  AppState,
  AppStateStatus,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Figtree_400Regular,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_900Black,
} from "@expo-google-fonts/figtree";
import { DMMono_400Regular } from "@expo-google-fonts/dm-mono";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { ProfileProvider, useProfile } from "@/context/profile-context";
import { MembershipProvider } from "@/context/membership-context";
import { ActivityProvider } from "@/context/activity-context";
import { ThemeProvider, typography, useTheme } from "@/theme";
import { ShareMenuProvider } from "@/components/share/ShareMenuSheet";
import {
  createSessionFromAuthUrl,
  isAuthCallbackUrl,
} from "@/utils/authDeepLink";
import { routes } from "@/utils/routes";
import { retryPendingPushUnregistrationAsync } from "@/services/pushNotificationService";
import { requestAppTrackingTransparencyAsync } from "@/services/appTrackingTransparencyService";
import { isAuthApiError, type Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/types";
import {
  acceptVisitorPreview,
  clearPendingMembershipReturn,
  consumePendingMembershipReturn,
  getPendingMembershipReturn,
  hasAcceptedVisitorPreview,
} from "@/services/visitor-session";

// Keep the splash screen visible while we fetch resources
// Must be called in global scope per Expo docs
SplashScreen.preventAutoHideAsync();

const isOnboardingExemptPath = (path: string) =>
  path === "/" ||
  path === "/welcome" ||
  path === "/onboarding" ||
  path === "/membership" ||
  path === "/sign-in" ||
  path === "/sign-up" ||
  path.startsWith("/auth");

const isAuthenticationPath = (path: string) =>
  path === "/" ||
  path === "/welcome" ||
  path === "/auth" ||
  path === "/sign-in" ||
  path === "/sign-up" ||
  path.startsWith("/auth/");

const getAuthenticatedDefaultRoute = (profile: Profile | null) => {
  if (!profile) return routes.welcome();
  if (!profile.username || !profile.eula_accepted) return routes.onboarding();
  return routes.home();
};

type InitialAuthResolution = {
  session: Session | null;
  shouldChooseDefaultRoute: boolean;
  visitorPreviewAccepted: boolean;
  membershipReturnPath: string | null;
};

/**
 * Last-resort catch for render-time throws anywhere in the app — without it
 * a production render error is a frozen white screen with no way out.
 * Deliberately unthemed: it must render even if the theme provider is what
 * broke. expo-router picks this export up automatically.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    reportError("[ErrorBoundary] Render error:", error);
  }, [error]);

  return (
    <View style={errorBoundaryStyles.container}>
      <Text style={errorBoundaryStyles.title}>Something went wrong</Text>
      <Text style={errorBoundaryStyles.body}>
        An unexpected error occurred. Please try again.
      </Text>
      <Pressable
        onPress={retry}
        style={({ pressed }) => [
          errorBoundaryStyles.button,
          pressed && errorBoundaryStyles.buttonPressed,
        ]}
        accessibilityRole="button"
        accessibilityLabel="Try again"
      >
        <Text style={errorBoundaryStyles.buttonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const errorBoundaryStyles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    gap: 12,
    backgroundColor: "#ffffff",
  },
  title: {
    ...typography.title,
    color: "#1a1a1a",
  },
  body: {
    ...typography.body,
    color: "#555555",
    textAlign: "center",
  },
  button: {
    marginTop: 12,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
    backgroundColor: "#336654",
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    ...typography.bodyStrong,
    color: "#ffffff",
  },
});

function RootLayout() {
  return (
    // Required by @gorhom/bottom-sheet's gestures (the map sheet).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        {/* At the root, not inside the tabs: the composer and the caption
            editor are presented over the tabs from the root stack, and they
            need the same signed-in member the tabs do. */}
        <ProfileProvider>
          <MembershipProvider>
            <ActivityProvider>
              <ShareMenuProvider>
                <RootLayoutNav />
              </ShareMenuProvider>
            </ActivityProvider>
          </MembershipProvider>
        </ProfileProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

export function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const {
    profile,
    loading: profileLoading,
    profileError,
    refreshProfile,
  } = useProfile();
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_900Black,
    DMMono_400Regular,
  });
  const router = useRouter();
  const pathname = usePathname();
  const [isReadyOverride, setIsReady] = useState(false);
  const [hasCompletedStartupNavigation, setHasCompletedStartupNavigation] =
    useState(false);
  const [initialAuth, setInitialAuth] = useState<InitialAuthResolution | null>(
    null
  );
  const [pendingSignedInUserId, setPendingSignedInUserId] = useState<
    string | null
  >(null);
  const isStartupResolved = Boolean(
    fontsLoaded && initialAuth && (!profileLoading || profileError)
  );
  const startupTarget = (() => {
    if (!isStartupResolved || !initialAuth) return null;
    if (!initialAuth.session) {
      if (!initialAuth.shouldChooseDefaultRoute) return null;
      return initialAuth.visitorPreviewAccepted
        ? routes.home()
        : routes.welcome();
    }
    if (profileError) return null;

    const authenticatedTarget = getAuthenticatedDefaultRoute(profile);
    if (authenticatedTarget !== routes.home()) return authenticatedTarget;
    if (!initialAuth.shouldChooseDefaultRoute) return null;
    return initialAuth.membershipReturnPath ?? authenticatedTarget;
  })();
  const isReady = isReadyOverride || isStartupResolved;
  const rootNavigationState = useRootNavigationState();
  const hasHandledInitialSession = useRef(false);
  const hadStartupProfileError = useRef(false);
  const authSessionRef = useRef<Session | null>(null);
  const lastHandledAuthUrl = useRef<string | null>(null);

  // The auth effect below runs once, so reading `pathname`/`isReady` directly
  // inside it would capture their first-render values forever. Mirror them into
  // refs the callbacks can read live.
  const pathnameRef = useRef(pathname);
  const isReadyRef = useRef(isReady);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    if (
      !isReady ||
      !rootNavigationState?.key ||
      profileLoading ||
      !profile ||
      isOnboardingExemptPath(pathname) ||
      (profile.username && profile.eula_accepted)
    ) {
      return;
    }

    router.replace(routes.onboarding());
  }, [
    isReady,
    pathname,
    profile,
    profileLoading,
    rootNavigationState?.key,
    router,
  ]);

  useEffect(() => {
    if (!isReady || !fontsLoaded) return;

    void requestAppTrackingTransparencyAsync();
  }, [fontsLoaded, isReady]);

  useEffect(() => {
    if (profileError && !profile) {
      hadStartupProfileError.current = true;
    }
  }, [profile, profileError]);

  useEffect(() => {
    if (
      !hadStartupProfileError.current ||
      profileError ||
      profileLoading ||
      !profile ||
      !initialAuth?.session ||
      !rootNavigationState?.key
    ) {
      return;
    }

    hadStartupProfileError.current = false;
    const target = getAuthenticatedDefaultRoute(profile);
    if (pathname !== target) router.replace(target);
  }, [
    initialAuth?.session,
    pathname,
    profile,
    profileError,
    profileLoading,
    rootNavigationState?.key,
    router,
  ]);

  // A fresh sign-in is not a complete routing decision: first wait for the
  // signed-in member's profile so a new account goes straight to Onboarding
  // and an existing account goes straight to Home. Keeping the auth screen
  // mounted while that read completes avoids briefly mounting the wrong tree.
  useEffect(() => {
    if (
      !pendingSignedInUserId ||
      !isReady ||
      !rootNavigationState?.key ||
      profileLoading ||
      profile?.id !== pendingSignedInUserId
    ) {
      return;
    }

    setPendingSignedInUserId(null);
    void (async () => {
      const defaultTarget = getAuthenticatedDefaultRoute(profile);
      const pending =
        defaultTarget === routes.home()
          ? await consumePendingMembershipReturn().catch(() => null)
          : null;
      const target = pending?.returnTo ?? defaultTarget;
      if (pathname !== target) router.replace(target as never);
    })();
  }, [
    isReady,
    pathname,
    pendingSignedInUserId,
    profile,
    profileLoading,
    rootNavigationState?.key,
    router,
  ]);

  // Startup is resolved only after both persisted auth and profile state are
  // known. Visitor tabs also depend on profile=null, so revealing Home before
  // that read finishes would create a blank frame beneath the native splash.
  // Until this point RootLayoutNav returns null, leaving the native splash in
  // place and keeping every route screen unmounted. Once the navigator exists,
  // keep that splash up until the selected route is the current route.
  useEffect(() => {
    if (
      !isStartupResolved ||
      hasCompletedStartupNavigation ||
      !rootNavigationState?.key
    ) {
      return;
    }

    if (startupTarget && pathname !== startupTarget) {
      router.replace(startupTarget as never);
      return;
    }

    if (startupTarget && startupTarget === initialAuth?.membershipReturnPath) {
      void clearPendingMembershipReturn().catch(() => {});
    }

    void SplashScreen.hideAsync().finally(() => {
      setHasCompletedStartupNavigation(true);
    });
  }, [
    hasCompletedStartupNavigation,
    isStartupResolved,
    pathname,
    rootNavigationState?.key,
    router,
    startupTarget,
    initialAuth?.membershipReturnPath,
  ]);

  useEffect(() => {
    // Initialize caches (non-blocking). loadFromStorage already prunes
    // expired entries in one batched multiGet/multiRemove pass.
    imageCache.loadFromStorage();
    authCache.loadFromStorage();
    void retryPendingPushUnregistrationAsync();

    const handleAuthUrl = async (url: string) => {
      if (!isAuthCallbackUrl(url) || lastHandledAuthUrl.current === url) {
        return;
      }

      lastHandledAuthUrl.current = url;
      try {
        await createSessionFromAuthUrl(url);
      } catch (error: any) {
        reportError("[RootLayout] Auth callback failed:", error);
        Alert.alert(
          "Sign-in link unavailable",
          error.message || "This sign-in link is invalid or has expired."
        );
        setIsReady(true);
        router.replace(routes.auth());
        await SplashScreen.hideAsync();
      }
    };

    const linkingSubscription = Linking.addEventListener("url", ({ url }) => {
      void handleAuthUrl(url);
    });
    Linking.getInitialURL().then((url) => {
      if (url) void handleAuthUrl(url);
    });

    const resolveInitialSession = async (session: Session | null) => {
      if (hasHandledInitialSession.current || isReadyRef.current) return;

      let launchedViaDeepLink: string | null = null;
      try {
        launchedViaDeepLink = await Linking.getInitialURL();
      } catch (error) {
        reportError("[RootLayout] Failed to read the initial URL:", error);
      }

      const isAuthLaunch =
        !!launchedViaDeepLink && isAuthCallbackUrl(launchedViaDeepLink);

      // The first persisted-session result is normally signed out while an
      // auth callback is still exchanging its tokens. Keep the native splash
      // up until that callback emits SIGNED_IN, or handleAuthUrl reports a
      // definitive failure and reveals the auth screen.
      if (isAuthLaunch && !session) return;

      const deepLinkRouted =
        !!launchedViaDeepLink && !isAuthLaunch && pathnameRef.current !== "/";

      hasHandledInitialSession.current = true;
      authSessionRef.current = session;
      const pendingMembership = session
        ? await getPendingMembershipReturn().catch(() => null)
        : null;
      setInitialAuth({
        session,
        shouldChooseDefaultRoute: !deepLinkRouted,
        visitorPreviewAccepted: session
          ? true
          : await hasAcceptedVisitorPreview().catch(() => false),
        membershipReturnPath: pendingMembership?.returnTo ?? null,
      });
    };

    // Listen for authentication state changes - single source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      log("[RootLayout] Auth state changed:", event, !!session);

      if (event === "INITIAL_SESSION") {
        await resolveInitialSession(session);
      } else if (event === "SIGNED_IN" && session) {
        if (!hasHandledInitialSession.current) {
          await resolveInitialSession(session);
        } else {
          const wasSignedOut = !authSessionRef.current;
          authSessionRef.current = session;

          // Existing sessions can re-emit SIGNED_IN when refreshed, so only
          // a real signed-out -> signed-in transition from an auth screen
          // starts destination selection.
          if (wasSignedOut && isAuthenticationPath(pathnameRef.current)) {
            setPendingSignedInUserId(session.user.id);
          }
        }
      } else if (event === "SIGNED_OUT") {
        // User signed out
        authSessionRef.current = null;
        setPendingSignedInUserId(null);
        await authCache.invalidateCache();
        if (!hasHandledInitialSession.current) {
          await resolveInitialSession(null);
        } else {
          await acceptVisitorPreview().catch(() => {});
          router.replace(routes.home());
        }
      }
    });

    // INITIAL_SESSION is normally emitted by the listener. The explicit
    // read gives initialization a deterministic error path as well: invalid
    // or unreadable persisted sessions resolve to signed-out without relying
    // on a timer to reveal the Welcome screen.
    void supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          // A rejected refresh token just means the persisted session lapsed
          // (idle device, revoked token) — the user is signed out, nothing
          // broke. Keep reportError for failures that aren't auth-API answers.
          if (isAuthApiError(error)) {
            warn("[RootLayout] Stored session is no longer valid:", error);
          } else {
            reportError("[RootLayout] Failed to restore the session:", error);
          }
        }
        return resolveInitialSession(error ? null : session);
      })
      .catch((error) => {
        reportError("[RootLayout] Failed to initialize auth:", error);
        return resolveInitialSession(null);
      });

    // Handle app state changes (resume from background)
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      void authCache.onAppStateChange(nextAppState);

      if (nextAppState === "active") {
        void retryPendingPushUnregistrationAsync();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.unsubscribe();
      linkingSubscription.remove();
      appStateSubscription?.remove();
    };
  }, [router]);

  // Return null to keep native splash visible until ready (per Expo docs).
  // Also wait on the brand fonts so first paint isn't in the system face.
  if (!isReady || !fontsLoaded) {
    return null;
  }

  if (initialAuth?.session && !profile && profileError) {
    return (
      <View
        style={[
          errorBoundaryStyles.container,
          { backgroundColor: colors.background },
        ]}
      >
        <StatusBar style={isDark ? "light" : "dark"} />
        <Text style={[errorBoundaryStyles.title, { color: colors.text }]}>
          Unable to load your profile
        </Text>
        <Text style={[errorBoundaryStyles.body, { color: colors.textMuted }]}>
          {profileError} You&apos;re still signed in.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try loading profile again"
          disabled={profileLoading}
          onPress={() => void refreshProfile()}
          style={({ pressed }) => [
            errorBoundaryStyles.button,
            (pressed || profileLoading) && errorBoundaryStyles.buttonPressed,
          ]}
        >
          <Text style={errorBoundaryStyles.buttonText}>
            {profileLoading ? "Trying again…" : "Try again"}
          </Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.accent,
          headerShadowVisible: false,
          headerTitleStyle: {
            ...typography.heading,
            color: colors.text,
          },
        }}
      >
        {/* Startup destinations never animate in. Arriving at one of these is
            always a replace (cold start, sign-in/out, onboarding completion),
            and the previous gate — flipping a stack-wide animation flag once
            startup navigation settled — raced the native transition: the flag
            flipped to "default" while the cold-start replace was still
            pending, so the feed slid in from under the splash. A static
            per-screen "none" cannot race anything. */}
        <Stack.Screen name="(tabs)" options={{ animation: "none" }} />
        <Stack.Screen name="welcome" options={{ animation: "none" }} />
        <Stack.Screen name="onboarding" options={{ animation: "none" }} />
        <Stack.Screen
          name="membership"
          options={{
            presentation: "formSheet",
            gestureEnabled: false,
            sheetGrabberVisible: false,
            sheetAllowedDetents: [0.72, 1],
            contentStyle: { backgroundColor: "transparent" },
          }}
        />
        {/* Composing is a task, not a place: presented over whatever you
            were looking at, so cancelling returns you there instead of
            leaving a half-written draft parked in a tab. */}
        <Stack.Screen
          name="review"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
          }}
        />
        <Stack.Screen
          name="review-share-preview"
          options={{
            presentation: "fullScreenModal",
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </>
  );
}
