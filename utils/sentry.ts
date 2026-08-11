import Constants from "expo-constants";
import * as Updates from "expo-updates";
import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
const enableOutsideProduction =
  process.env.EXPO_PUBLIC_SENTRY_ENABLE_OUTSIDE_PROD === "1";
const sendStartupTestEvent =
  process.env.EXPO_PUBLIC_SENTRY_SEND_STARTUP_TEST_EVENT === "1";
const appEnvironment =
  Constants.expoConfig?.extra?.environment ??
  process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ??
  "development";
const isProduction = appEnvironment === "production";
const isEnabled = Boolean(dsn) && (isProduction || enableOutsideProduction);

Sentry.init({
  dsn,
  enabled: isEnabled,
  environment: String(appEnvironment),
  sendDefaultPii: false,
  tracesSampleRate: isProduction ? 0.1 : 0,
});

const manifest = Updates.manifest;
const metadata =
  manifest && "metadata" in manifest ? manifest.metadata : undefined;
const updateGroup =
  metadata && typeof metadata === "object" && "updateGroup" in metadata
    ? metadata.updateGroup
    : undefined;

if (updateGroup) {
  Sentry.setTag("expo.updateGroup", String(updateGroup));
}

if (isEnabled && sendStartupTestEvent) {
  Sentry.captureMessage("Tini Time Club Sentry startup test", {
    level: "info",
    tags: {
      "sentry.test": "startup",
    },
  });
  void Sentry.flush();
}

export { Sentry };
