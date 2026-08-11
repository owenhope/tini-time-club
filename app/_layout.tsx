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
import { log, reportError } from "@/utils/log";
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
  Figtree_300Light,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
  Figtree_900Black,
} from "@expo-google-fonts/figtree";
import {
  DMMono_400Regular,
  DMMono_500Medium,
} from "@expo-google-fonts/dm-mono";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { ProfileProvider, useProfile } from "@/context/profile-context";
import { ThemeProvider, fonts, useTheme } from "@/theme";
import {
  createSessionFromAuthUrl,
  isAuthCallbackUrl,
} from "@/utils/authDeepLink";
import { routes } from "@/utils/routes";
import { retryPendingPushUnregistrationAsync } from "@/services/pushNotificationService";
import { withTimeout } from "@/utils/async";

// Keep the splash screen visible while we fetch resources
// Must be called in global scope per Expo docs
SplashScreen.preventAutoHideAsync();

const isOnboardingExemptPath = (path: string) =>
  path === "/" ||
  path === "/onboarding" ||
  path === "/favorite-location" ||
  path === "/forgot-password" ||
  path === "/reset-password" ||
  path === "/sign-in" ||
  path === "/sign-up" ||
  path.startsWith("/auth");

const RESUME_SESSION_TIMEOUT_MS = 5000;

/**
 * Last-resort catch for render-time throws anywhere in the app — without it
 * a production render error is a frozen white screen with no way out.
 * Deliberately unthemed: it must render even if the theme provider is what
 * broke. expo-router picks this export up automatically.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  reportError("[ErrorBoundary] Render error:", error);

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
    fontSize: 20,
    fontFamily: fonts.semibold,
    color: "#1a1a1a",
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
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
    color: "#ffffff",
    fontSize: 15,
    fontFamily: fonts.semibold,
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
          <RootLayoutNav />
        </ProfileProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

export default Sentry.wrap(RootLayout);

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const { profile, loading: profileLoading } = useProfile();
  const [fontsLoaded] = useFonts({
    Figtree_300Light,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    Figtree_800ExtraBold,
    Figtree_900Black,
    DMMono_400Regular,
    DMMono_500Medium,
  });
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  // Initial-launch destination waiting on the router to mount; the splash
  // stays up until we actually arrive there.
  const [pendingRoute, setPendingRoute] = useState<
    ReturnType<typeof routes.home> | ReturnType<typeof routes.welcome> | null
  >(null);
  const rootNavigationState = useRootNavigationState();
  const appState = useRef(AppState.currentState);
  const isCheckingSession = useRef(false);
  const hasHandledInitialSession = useRef(false);
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

  // Perform the initial-launch navigation as soon as the router is ready —
  // this replaces the old fixed 200 ms "wait for Stack to mount" sleep.
  useEffect(() => {
    if (pendingRoute && rootNavigationState?.key) {
      router.replace(pendingRoute);
    }
  }, [pendingRoute, rootNavigationState?.key, router]);

  // Hide the splash when we arrive at the launch destination — this replaces
  // the old fixed 400 ms "wait for navigation" sleep. The timeout is a
  // backstop so a route mismatch can never strand the splash.
  useEffect(() => {
    if (!pendingRoute) return;

    if (pathname === pendingRoute) {
      setPendingRoute(null);
      void SplashScreen.hideAsync();
      return;
    }

    const backstop = setTimeout(() => {
      setPendingRoute(null);
      void SplashScreen.hideAsync();
    }, 2000);
    return () => clearTimeout(backstop);
  }, [pathname, pendingRoute]);

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

    // Watchdog: if auth never reports (e.g. session restore failed in a way
    // the storage adapter couldn't absorb), don't leave the user on the
    // splash screen forever — surface the sign-in screen instead.
    const splashWatchdog = setTimeout(() => {
      // isReadyRef also covers the paths that mount the app without marking
      // the initial session handled (password recovery, auth-link errors).
      if (!hasHandledInitialSession.current && !isReadyRef.current) {
        hasHandledInitialSession.current = true;
        reportError("[RootLayout] Auth never initialized; forcing sign-in");
        setIsReady(true);
        router.replace(routes.welcome());
        void SplashScreen.hideAsync();
      }
    }, 5000);

    // Listen for authentication state changes - single source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      log("[RootLayout] Auth state changed:", event, !!session);

      if (event === "PASSWORD_RECOVERY") {
        // Recovery deep link: let the user set a new password instead of
        // dropping them on the feed.
        setIsReady(true);
        router.replace(routes.resetPassword());
        await SplashScreen.hideAsync();
        return;
      }

      if (event === "INITIAL_SESSION" && !hasHandledInitialSession.current) {
        hasHandledInitialSession.current = true;

        // Decide where this launch should land — unless a deep link is being
        // handled. Auth callbacks navigate from handleAuthUrl, and a routable
        // link (a shared review, a profile) has already moved us off the
        // entry route. But an unroutable launch URL must NOT suppress the
        // redirect, or a signed-in user gets stranded on the welcome screen.
        const launchedViaDeepLink = await Linking.getInitialURL();
        const isAuthLaunch =
          !!launchedViaDeepLink && isAuthCallbackUrl(launchedViaDeepLink);
        const deepLinkRouted =
          !!launchedViaDeepLink && pathnameRef.current !== "/";

        const target =
          !isAuthLaunch && !deepLinkRouted
            ? session
              ? routes.home()
              : routes.welcome()
            : null;

        // Mount the Stack; the navigation + splash-hide effects below take
        // over once the router reports ready — no fixed timers.
        setIsReady(true);

        if (target && pathnameRef.current !== target) {
          setPendingRoute(target);
        } else {
          await SplashScreen.hideAsync();
        }
      } else if (event === "SIGNED_IN" && session) {
        // User signed in (email, Apple, Google, etc.). Recovery links also emit
        // SIGNED_IN; staying put keeps the reset screen on screen.
        if (pathnameRef.current !== "/reset-password") {
          router.replace(routes.home());
        }
      } else if (event === "SIGNED_OUT") {
        // User signed out
        await authCache.invalidateCache();
        router.replace(routes.welcome());
      }
    });

    // Handle app state changes (resume from background)
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const previousAppState = appState.current;
      appState.current = nextAppState;
      authCache.onAppStateChange(nextAppState);

      if (
        previousAppState.match(/inactive|background/) &&
        nextAppState === "active" &&
        !isCheckingSession.current &&
        isReadyRef.current &&
        pathnameRef.current !== "/"
      ) {
        isCheckingSession.current = true;

        try {
          const session = await withTimeout(
            authCache.getSession(),
            RESUME_SESSION_TIMEOUT_MS,
            "Resume session check timed out"
          );
          if (
            !session &&
            appState.current === "active" &&
            pathnameRef.current !== "/"
          ) {
            router.replace(routes.welcome());
          }
        } catch (error) {
          reportError(
            "[RootLayout] ❌ Error during resume session check:",
            error
          );
        } finally {
          isCheckingSession.current = false;
        }
      }

      if (nextAppState === "active") {
        void retryPendingPushUnregistrationAsync();
      }
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      clearTimeout(splashWatchdog);
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
            color: colors.text,
            fontFamily: fonts.bold,
            fontSize: 17,
          },
        }}
      >
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
