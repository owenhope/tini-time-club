import React, { useEffect, useState, useRef } from "react";
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
  const hasNavigated = useRef(false);

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
    if (!initialized || hasNavigated.current) return;

    const navigate = async () => {
      const inAuthGroup = segments[0] === "(auth)";
      if (session) {
        // If session exists but not in the correct authenticated route, redirect.
        if (!inAuthGroup || segments[1] !== "home") {
          await router.replace("/(auth)/home");
        }
      } else {
        // If no session exists and we're inside the auth group, redirect to the public route.
        if (inAuthGroup) {
          await router.replace("/");
        }
      }
      hasNavigated.current = true;
      setReady(true);
    };

    // Delay navigation slightly to ensure the layout has mounted.
    setTimeout(navigate, 100);
  }, [initialized, session, router, segments]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  // Always render the Slot so that the navigator stays mounted.
  return <Slot />;
};

export default InitialLayout;
