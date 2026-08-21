import Constants from "expo-constants";
import * as Updates from "expo-updates";
import * as Sentry from "@sentry/react-native";
import { registerErrorReporter } from "@/utils/log";

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

const safeErrorDetails = (value: unknown) => {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  return Object.fromEntries(
    ["name", "message", "code", "status"].flatMap((key) => {
      const detail = record[key];
      return typeof detail === "string" || typeof detail === "number"
        ? [[key, detail]]
        : [];
    })
  );
};

registerErrorReporter((...args: unknown[]) => {
  const context = args
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .trim();
  const exception = args.find((value) => value instanceof Error);
  const errorLike = args.find(
    (value) => value && typeof value === "object" && !(value instanceof Error)
  );

  if (exception) {
    Sentry.captureException(exception, {
      extra: context ? { context } : undefined,
    });
    return;
  }

  Sentry.captureMessage(context || "Application error reported", {
    level: "error",
    extra: errorLike ? { error: safeErrorDetails(errorLike) } : undefined,
  });
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
