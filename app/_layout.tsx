import "react-native-get-random-values";
import { useEffect, useState, useRef } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { supabase } from "@/utils/supabase";
import imageCache from "@/utils/imageCache";
import authCache from "@/utils/authCache";
import { AppState, AppStateStatus } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { Platform, View, Text } from "react-native";
import * as TrackingTransparency from "expo-tracking-transparency";

// Keep the splash screen visible while we fetch resources
// Must be called in global scope per Expo docs
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [isReady, setIsReady] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const appState = useRef(AppState.currentState);
  const isCheckingSession = useRef(false);
  const hasHandledInitialSession = useRef(false);

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
          console.error("[RootLayout] ❌ Error requesting tracking permission:", error);
        });
    }

    // Listen for authentication state changes - single source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[RootLayout] Auth state changed:", event, !!session);

      if (event === "INITIAL_SESSION" && !hasHandledInitialSession.current) {
        hasHandledInitialSession.current = true;
        
        // Mount Stack first so we can navigate
        setIsReady(true);
        
        // Wait for Stack to mount
        await new Promise(resolve => setTimeout(resolve, 200));

        // Navigate based on session
        if (session) {
          if (pathname !== "/(tabs)/home") {
            router.replace("/(tabs)/home");
          }
        } else {
          if (pathname !== "/") {
            router.replace("/");
          }
        }

        // Wait for navigation to complete
        await new Promise(resolve => setTimeout(resolve, 400));

        // Hide splash after navigation completes
        await SplashScreen.hideAsync();
      } else if (event === "SIGNED_IN" && session) {
        // User signed in (email, Apple, Google, etc.)
        router.replace("/(tabs)/home");
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
        isReady &&
        pathname !== "/"
      ) {
        isCheckingSession.current = true;
        setIsResuming(true);

        try {
          const session = await authCache.getSession();
          if (!session && pathname !== "/") {
            router.replace("/");
          }
        } catch (error) {
          console.error("[RootLayout] ❌ Error during resume session check:", error);
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
      <Stack screenOptions={{ headerShown: false }} />
      {/* Loading overlay during resume session check */}
      {isResuming && (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#B6A3E2",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
          }}
        >
          <Text style={{ color: "white", fontSize: 16 }}>Loading...</Text>
        </View>
      )}
    </>
  );
}
