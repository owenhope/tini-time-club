import React, { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { supabase } from "@/utils/supabase";

// Prevent the splash screen from auto-hiding.
SplashScreen.preventAutoHideAsync();

const InitialLayout = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [initialized, setInitialized] = useState(false);
  const [ready, setReady] = useState(false);

  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const initialize = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSession(session);
      setInitialized(true);
    };

    initialize();

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!initialized) return;

    const navigate = async () => {
      const inAuthGroup = segments[0] === "(auth)";

      if (session) {
        if (!inAuthGroup || segments[1] !== "home") {
          await router.replace("/(auth)/home");
        }
      } else {
        if (inAuthGroup) {
          await router.replace("/");
        }
      }
      setReady(true);
    };

    navigate();
  }, [session, initialized, segments, router]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  return <Slot />;
};

export default InitialLayout;
