import "react-native-get-random-values";
import { useEffect, useState, useRef } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { supabase } from "@/utils/supabase";
import imageCache from "@/utils/imageCache";
import authCache from "@/utils/authCache";
import { AppState, AppStateStatus } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { Platform, View, ActivityIndicator } from "react-native";
import * as TrackingTransparency from "expo-tracking-transparency";
import * as Linking from "expo-linking";
import { ThemeProvider, useTheme } from "@/theme";

// Keep the splash screen visible while we fetch resources
// Must be called in global scope per Expo docs
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const appState = useRef(AppState.currentState);
  const isCheckingSession = useRef(false);
  const hasHandledInitialSession = useRef(false);

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
    // Initialize caches (non-blocking)
    imageCache.loadFromStorage();
    imageCache.clearExpiredCache();
    authCache.loadFromStorage();

    // Request tracking transparency permission on iOS (non-blocking)
    if (Platform.OS === "ios") {
      TrackingTransparency.requestTrackingPermissionsAsync()
        .then(({ status }) => {
          console.log("[RootLayout] 📊 Tracking permission status:", status);
        })
        .catch((error) => {
          console.error(
            "[RootLayout] ❌ Error requesting tracking permission:",
            error
          );
        });
    }

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

        // Mount Stack first so we can navigate
        setIsReady(true);

        // Wait for Stack to mount
        await new Promise((resolve) => setTimeout(resolve, 200));

        // Navigate based on session. A deep link (password recovery, a shared
        // review, a profile) already routed us somewhere — don't overwrite it.
        const launchedViaDeepLink = await Linking.getInitialURL();

        if (!launchedViaDeepLink) {
          if (session) {
            if (pathnameRef.current !== "/home") {
              router.replace("/home");
            }
          } else if (pathnameRef.current !== "/") {
            router.replace("/");
          }
        }

        // Wait for navigation to complete
        await new Promise((resolve) => setTimeout(resolve, 400));

        // Hide splash after navigation completes
        await SplashScreen.hideAsync();
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

      appState.current = nextAppState;
    };

    const appStateSubscription = AppState.addEventListener(
      "change",
      handleAppStateChange
    );

    return () => {
      subscription.unsubscribe();
      appStateSubscription?.remove();
    };
  }, []);

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
