import { useEffect, useState } from "react";
import { Slot, usePathname, useRouter } from "expo-router";
import { supabase } from "@/utils/supabase";
import * as SplashScreen from "expo-splash-screen";
import { InteractionManager } from "react-native";

SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [appReady, setAppReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      InteractionManager.runAfterInteractions(() => {
        if (session && pathname !== "/(auth)/home") {
          setTimeout(() => router.replace("/(auth)/home"), 100);
        } else if (!session && pathname !== "/") {
          setTimeout(() => router.replace("/"), 100);
        }

        setAppReady(true);
      });
    };

    init();
  }, []);

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync();
    }
  }, [appReady]);

  if (!appReady) return null;

  return <Slot />;
};

export default InitialLayout;
