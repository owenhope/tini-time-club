import "react-native-get-random-values";
import { useEffect, useState, useRef } from "react";
import {
  Stack,
  useRouter,
  usePathname,
  useRootNavigationState,
} from "expo-router";
import { supabase } from "@/utils/supabase";
import imageCache from "@/utils/imageCache";
import authCache from "@/utils/authCache";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as Linking from "expo-linking";
import { ThemeProvider, useTheme } from "@/theme";
import {
  createSessionFromAuthUrl,
  isAuthCallbackUrl,
} from "@/utils/authDeepLink";
import { retryPendingPushUnregistrationAsync } from "@/services/pushNotificationService";

// Keep the splash screen visible while we fetch resources
// Must be called in global scope per Expo docs
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    // Required by @gorhom/bottom-sheet's gestures (the map sheet).
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootLayoutNav />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  // Initial-launch destination waiting on the router to mount; the splash
  // stays up until we actually arrive there.
  const [pendingRoute, setPendingRoute] = useState<string | null>(null);
  const [isResuming, setIsResuming] = useState(false);
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

  // Perform the initial-launch navigation as soon as the router is ready —
  // this replaces the old fixed 200 ms "wait for Stack to mount" sleep.
  useEffect(() => {
    if (pendingRoute && rootNavigationState?.key) {
      router.replace(pendingRoute as never);
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
        console.error("[RootLayout] Auth callback failed:", error);
        Alert.alert(
          "Sign-in link unavailable",
          error.message || "This sign-in link is invalid or has expired."
        );
        setIsReady(true);
        router.replace("/auth");
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
        console.error("[RootLayout] Auth never initialized; forcing sign-in");
        setIsReady(true);
        router.replace("/");
        void SplashScreen.hideAsync();
      }
    }, 5000);

    // Listen for authentication state changes - single source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[RootLayout] Auth state changed:", event, !!session);

      if (event === "PASSWORD_RECOVERY") {
        // Recovery deep link: let the user set a new password instead of
        // dropping them on the feed.
        setIsReady(true);
        router.replace("/reset-password");
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
          !isAuthLaunch && !deepLinkRouted ? (session ? "/home" : "/") : null;

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
          router.replace("/home");
        }
      } else if (event === "SIGNED_OUT") {
        // User signed out
        await authCache.invalidateCache();
        router.replace("/");
      }
    });

    // Handle app state changes (resume from background)
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      authCache.onAppStateChange(nextAppState);

      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active" &&
        !isCheckingSession.current &&
        isReadyRef.current &&
        pathnameRef.current !== "/"
      ) {
        isCheckingSession.current = true;
        setIsResuming(true);

        try {
          const session = await authCache.getSession();
          if (!session && pathnameRef.current !== "/") {
            router.replace("/");
          }
        } catch (error) {
          console.error(
            "[RootLayout] ❌ Error during resume session check:",
            error
          );
        } finally {
          isCheckingSession.current = false;
          setIsResuming(false);
        }
      }

      if (nextAppState === "active") {
        void retryPendingPushUnregistrationAsync();
      }

      appState.current = nextAppState;
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

  // Return null to keep native splash visible until ready (per Expo docs)
  if (!isReady) {
    return null;
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {/* Lives in the root stack rather than a tab stack so it can be
            pushed from any tab and back returns to wherever it was opened. */}
        <Stack.Screen
          name="edit-caption"
          options={{
            headerShown: true,
            title: "Edit Caption",
            headerBackButtonDisplayMode: "minimal",
            headerTintColor: colors.text,
            headerStyle: { backgroundColor: colors.surface },
          }}
        />
      </Stack>
      {/* Loading overlay during resume session check */}
      {isResuming && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: colors.background,
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}
    </>
  );
}
