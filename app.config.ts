import { ConfigContext, ExpoConfig } from "expo/config";

// Use your actual EAS project ID, project slug, and owner.
// These values must remain consistent (except for dynamic parts like bundle identifiers).
const EAS_PROJECT_ID = "dcaa10ce-e677-478d-bd29-90a5108a4cc9";
const PROJECT_SLUG = "tini-time-club";
const OWNER = "hopemediahouse";

// Production config values for Tini Time Club.
const APP_NAME = "Tini Time Club";
const BUNDLE_IDENTIFIER = "com.ohope.tinitimeclub";
const PACKAGE_NAME = "com.ohope.tinitimeclub";
const ICON = "./assets/images/icon-purple.png";
const ADAPTIVE_ICON = "./assets/images/adaptive-icon.png";
const SCHEME = "tini-time-club";
const PHOTO_LIBRARY_USAGE_DESCRIPTION =
  "Allow Tini Time Club to access your photos so you can upload Martini review photos and choose a profile picture.";
const REQUIRED_RELEASE_ENVIRONMENT_VARIABLES = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_ANON_KEY",
  "EXPO_PUBLIC_META_APP_ID",
  "EXPO_PUBLIC_SENTRY_DSN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
] as const;

// Secret-visibility EAS variables exist only on the EAS builder (EAS_BUILD=1);
// the local `eas build` CLI evaluates this config without them, so requiring
// them locally would block every release build from starting.
const REQUIRED_BUILDER_ONLY_ENVIRONMENT_VARIABLES = [
  "SENTRY_AUTH_TOKEN",
] as const;

const validateReleaseEnvironment = (
  appEnvironment: "development" | "preview" | "production"
) => {
  if (appEnvironment === "development") {
    return;
  }

  const requiredVariables: readonly string[] =
    process.env.EAS_BUILD === "true"
      ? [
          ...REQUIRED_RELEASE_ENVIRONMENT_VARIABLES,
          ...REQUIRED_BUILDER_ONLY_ENVIRONMENT_VARIABLES,
        ]
      : REQUIRED_RELEASE_ENVIRONMENT_VARIABLES;

  const missingVariables = requiredVariables.filter(
    (variableName) => !process.env[variableName]?.trim()
  );

  if (missingVariables.length > 0) {
    throw new Error(
      `Missing required ${appEnvironment} environment variables: ${missingVariables.join(
        ", "
      )}. Configure them in the matching EAS environment before building.`
    );
  }
};

export default ({ config }: ConfigContext): ExpoConfig => {
  const appEnvironment =
    (process.env.APP_ENV as "development" | "preview" | "production") ||
    "development";
  const backendEnvironment = process.env.BACKEND_ENV || appEnvironment;

  validateReleaseEnvironment(appEnvironment);

  console.log(
    `Building ${appEnvironment} app against ${backendEnvironment} backend`
  );
  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(appEnvironment);

  return {
    ...config,
    name: name,
    // Bump this for every native release; see RELEASE.md. runtimeVersion
    // follows it, so shipping two different native builds under one version
    // would let an OTA update reach an incompatible binary.
    version: "4.0.0",
    slug: PROJECT_SLUG, // Must be consistent across all environments.
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    icon: icon,
    scheme: scheme,
    ios: {
      supportsTablet: false,
      bundleIdentifier: bundleIdentifier,
      // No googleMapsApiKey: react-native-maps >= 1.22 dropped Google Maps on
      // iOS, so the map uses Apple Maps there (Google remains on Android).
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: PHOTO_LIBRARY_USAGE_DESCRIPTION,
        NSPhotoLibraryAddUsageDescription:
          "Allow Tini Time Club to save a review card for sharing to Instagram.",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: adaptiveIcon,
        backgroundColor: "#ffffff",
      },
      package: packageName,
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
        },
      },
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.CAMERA",
      ],
    },
    web: {
      bundler: "metro",
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash-icon.png",
          imageWidth: 200,
          resizeMode: "contain",
          backgroundColor: "#B6A3E2",
        },
      ],
      [
        "expo-image-picker",
        {
          photosPermission: PHOTO_LIBRARY_USAGE_DESCRIPTION,
          microphonePermission: false,
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: false,
          locationAlwaysPermission: false,
          locationWhenInUsePermission:
            "Tini Time Club needs access to your location to show you nearby bars and restaurants where you can discover amazing Martinis. We'll help you find the best cocktail spots in your area!",
          // Must be a string, not false: expo-location's binary references
          // CoreMotion APIs regardless, and App Store Connect rejects uploads
          // missing NSMotionUsageDescription (ITMS-90683). `false` would also
          // strip any key set in ios.infoPlist above.
          motionUsagePermission:
            "Tini Time Club uses motion activity to improve location accuracy while finding bars near you.",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission:
            "Allow Tini Time Club to access your camera to take pictures of your Martinis or your profile picture.",
          microphonePermission: false,
          recordAudioAndroid: false,
          barcodeScannerEnabled: false,
        },
      ],
      [
        "expo-notifications",
        {
          color: "#336654",
          defaultChannel: "default",
        },
      ],
      [
        "expo-tracking-transparency",
        {
          userTrackingPermission:
            "Allow Tini Time Club to use your app activity to measure and improve the app experience.",
        },
      ],
      [
        "@react-native-google-signin/google-signin",
        {
          iosUrlScheme:
            "com.googleusercontent.apps.732397011472-41tr3sghlftkc5kcsr57v3570l9uot05",
        },
      ],
      [
        "expo-apple-authentication",
        {
          appleSignInEnabled: true,
        },
      ],
      "@sentry/react-native",
      ["expo-localization"],
      "expo-image",
      ["expo-secure-store", { faceIDPermission: false }],
      "expo-build-properties",
      [
        "react-native-share",
        {
          ios: ["instagram", "instagram-stories"],
          android: ["com.instagram.android"],
        },
      ],
    ],
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      eas: {
        projectId: EAS_PROJECT_ID,
      },
      router: {
        origin: false,
      },
      environment: appEnvironment,
      backendEnvironment,
      enableDevPushNotifications:
        process.env.EXPO_PUBLIC_ENABLE_DEV_PUSH_NOTIFICATIONS === "1",
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    },
    experiments: {
      typedRoutes: true,
    },
    owner: OWNER,
  };
};

// Dynamically configure the app based on the environment.
export const getDynamicAppConfig = (
  environment: "development" | "preview" | "production"
) => {
  if (environment === "production") {
    return {
      name: APP_NAME,
      bundleIdentifier: BUNDLE_IDENTIFIER,
      packageName: PACKAGE_NAME,
      icon: ICON,
      adaptiveIcon: ADAPTIVE_ICON,
      scheme: SCHEME,
    };
  }

  if (environment === "preview") {
    return {
      name: `${APP_NAME} Preview`,
      bundleIdentifier: `${BUNDLE_IDENTIFIER}.preview`,
      packageName: `${PACKAGE_NAME}.preview`,
      icon: "./assets/images/icons/iOS-Prev.png",
      adaptiveIcon: "./assets/images/icons/Android-Prev.png",
      scheme: `${SCHEME}-prev`,
    };
  }

  // Default to "development" configuration.
  return {
    name: `${APP_NAME} Development`,
    bundleIdentifier: `${BUNDLE_IDENTIFIER}.dev`,
    packageName: `${PACKAGE_NAME}.dev`,
    icon: "./assets/images/icons/iOS-Dev.png",
    adaptiveIcon: "./assets/images/icons/Android-Dev.png",
    scheme: `${SCHEME}-dev`,
  };
};
