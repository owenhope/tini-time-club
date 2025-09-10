import { useEffect, useState } from "react";
import { Stack, useRouter, usePathname } from "expo-router";
import { supabase } from "@/utils/supabase";
import * as SplashScreen from "expo-splash-screen";
import { View, Text } from "react-native";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

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
        // User signed out, navigate to login
        router.replace("/");
      }
    });

    return () => {
      subscription.unsubscribe();
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
}
