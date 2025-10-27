import "react-native-get-random-values";
import { useEffect, useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { supabase } from "@/utils/supabase";
import imageCache from "@/utils/imageCache";
import authCache from "@/utils/authCache";
import { AppState } from "react-native";
import * as SplashScreen from "expo-splash-screen";
import { View, Text, Platform } from "react-native";
import * as TrackingTransparency from "expo-tracking-transparency";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Initialize caches
        await imageCache.loadFromStorage();
        await imageCache.clearExpiredCache(); // Clear expired cache entries
        await authCache.loadFromStorage();

        // Request tracking transparency permission on iOS
        if (Platform.OS === "ios") {
          try {
            const { status } =
              await TrackingTransparency.requestTrackingPermissionsAsync();
            console.log("[RootLayout] 📊 Tracking permission status:", status);

            if (status === "granted") {
              console.log("[RootLayout] ✅ User granted tracking permission");
            } else {
              console.log("[RootLayout] ❌ User denied tracking permission");
            }
          } catch (trackingError) {
            console.error(
              "[RootLayout] ❌ Error requesting tracking permission:",
              trackingError
            );
          }
        }

        // Use cached session for faster startup
        const session = await authCache.getSession();

        if (session && pathname !== "/(tabs)/home") {
          setTimeout(() => router.replace("/(tabs)/home"), 0); // 👈 defer until after mount
          return;
        } else if (!session && pathname !== "/") {
          setTimeout(() => router.replace("/"), 0); // 👈 defer until after mount
          return;
        }
      } catch (error) {
        console.error("[RootLayout] ❌ Error during session check:", error);
      } finally {
        await SplashScreen.hideAsync();
        setReady(true);
      }
    };

    init();

    // Listen for authentication state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[RootLayout] Auth state changed:", event, !!session);

      if (event === "SIGNED_IN" && session) {
        // User just signed in, navigate to home
        router.replace("/(tabs)/home");
      } else if (event === "SIGNED_OUT") {
        // User signed out, clear cache and navigate to login
        await authCache.invalidateCache();
        router.replace("/");
      }
    });

    // Security: Handle app state changes
    const handleAppStateChange = (nextAppState: string) => {
      authCache.onAppStateChange(nextAppState);
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

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "black",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "white" }}>Loading...</Text>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
});