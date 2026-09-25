import Constants from "expo-constants";
import { Platform } from "react-native";
import type * as FacebookSdk from "react-native-fbsdk-next";
import type { AnalyticEventType } from "@/services/analyticsService";
import { warn } from "@/utils/log";

/**
 * Meta app events for ad optimization and install attribution.
 *
 * Only a small allowlist of product events is forwarded, mapped to Meta's
 * standard events, and never with properties: user IDs, usernames, and review
 * content stay out of Meta. The SDK logs installs and app opens on its own.
 */

type MetaStandardEvent = keyof typeof FacebookSdk.AppEventsLogger.AppEvents;

const META_EVENT_BY_ANALYTIC_EVENT: Partial<
  Record<AnalyticEventType, MetaStandardEvent>
> = {
  onboarding_completed: "CompletedRegistration",
  new_review: "Rated",
  view_location: "ViewedContent",
};

const isMetaAppEventsEnabled = () =>
  Platform.OS === "ios" &&
  Constants.expoConfig?.extra?.metaAppEventsEnabled === true;

// Loaded lazily: the SDK wires native event emitters at import time, which
// only exist in iOS builds configured with a Meta app ID.
const loadFacebookSdk = (): typeof FacebookSdk =>
  require("react-native-fbsdk-next");

export function logMetaAppEvent(event: AnalyticEventType): void {
  const metaEvent = META_EVENT_BY_ANALYTIC_EVENT[event];
  if (!metaEvent || !isMetaAppEventsEnabled()) return;

  try {
    const { AppEventsLogger } = loadFacebookSdk();
    AppEventsLogger.logEvent(AppEventsLogger.AppEvents[metaEvent]);
  } catch (error) {
    warn("[MetaAppEvents] Event logging failed:", event, error);
  }
}

// iOS 14.5–16 Meta SDKs rely on this flag; iOS 17+ reads ATT directly.
export function syncMetaAdvertiserTracking(trackingGranted: boolean): void {
  if (!isMetaAppEventsEnabled()) return;

  try {
    void loadFacebookSdk().Settings.setAdvertiserTrackingEnabled(
      trackingGranted
    );
  } catch (error) {
    warn("[MetaAppEvents] Advertiser tracking sync failed:", error);
  }
}
