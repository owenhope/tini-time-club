import { useEffect, useRef } from "react";
import { Alert, AppState, Linking } from "react-native";
import { checkForAppStoreUpdate } from "@/services/appVersionService";
import { requestAppTrackingTransparencyAsync } from "@/services/appTrackingTransparencyService";

const PROMPT_INTERVAL_MS = 12 * 60 * 60 * 1000;

export function useAppUpdatePrompt(ready: boolean) {
  const prompted = useRef<{ version: string; at: number } | null>(null);

  useEffect(() => {
    if (!ready) return;
    let disposed = false;
    let checking = false;
    let visible = false;
    let trackingRequested = false;

    const check = async () => {
      if (disposed || checking || visible || AppState.currentState !== "active")
        return;
      checking = true;
      try {
        if (!trackingRequested) {
          trackingRequested = true;
          await requestAppTrackingTransparencyAsync();
        }
        if (disposed || AppState.currentState !== "active") return;
        const update = await checkForAppStoreUpdate();
        if (disposed || AppState.currentState !== "active" || !update) return;
        const previous = prompted.current;
        if (
          previous?.version === update.latestVersion &&
          Date.now() - previous.at < PROMPT_INTERVAL_MS
        )
          return;

        visible = true;
        prompted.current = { version: update.latestVersion, at: Date.now() };
        const dismiss = () => {
          visible = false;
          prompted.current = { version: update.latestVersion, at: Date.now() };
        };
        Alert.alert(
          "Update available",
          `Tini Time Club ${update.latestVersion} is available. You're using ${update.installedVersion}.`,
          [
            { text: "Not now", style: "cancel", onPress: dismiss },
            {
              text: "Update",
              onPress: () => {
                dismiss();
                void Linking.openURL(update.storeUrl).catch(() => {
                  // Allow a later foreground attempt if opening the store failed.
                  prompted.current = null;
                });
              },
            },
          ],
          { onDismiss: dismiss }
        );
      } catch {
        // Optional prompts must never interrupt startup.
      } finally {
        checking = false;
      }
    };

    void check();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void check();
    });
    return () => {
      disposed = true;
      subscription.remove();
    };
  }, [ready]);
}
