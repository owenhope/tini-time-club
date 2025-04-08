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
