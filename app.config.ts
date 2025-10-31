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

export default ({ config }: ConfigContext): ExpoConfig => {
  console.log("⚙️ Building app for environment:", process.env.APP_ENV);
  const { name, bundleIdentifier, icon, adaptiveIcon, packageName, scheme } =
    getDynamicAppConfig(
      (process.env.APP_ENV as "development" | "preview" | "production") ||
        "development"
    );

  return {
    ...config,
    name: name,
    version: "2.2.2",
    slug: PROJECT_SLUG, // Must be consistent across all environments.
    orientation: "portrait",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    icon: icon,
    scheme: scheme,
    ios: {
      supportsTablet: false,
      bundleIdentifier: bundleIdentifier,
      config: {
        googleMapsApiKey: "AIzaSyAV4ioL2mbXF0mGeJsKfDUP_wnaDsQQ2nk",
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
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
          apiKey: "AIzaSyCGBwGNvHcIKasPMV67MS_RmYOM_2hRRQg",
        },
      },
      permissions: [
        "android.permission.RECORD_AUDIO",
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
          photoPermissions:
            "Allow Tini Time Club to access your photos to upload photos of your Martinis or your profile picture.",
        },
      ],
      [
        "expo-tracking-transparency", 
        { userTrackingPermission: 
          "Allow Tini Time Club to collect app-related data that can be used to deliver personalized Martini reviews, and suggested user profiles to you."
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Tini Time Club needs access to your location to show you nearby bars and restaurants where you can discover amazing Martinis. We'll help you find the best cocktail spots in your area!",
            locationWhenInUsePermission: "Tini Time Club needs access to your location to show you nearby bars and restaurants where you can discover amazing Martinis. We'll help you find the best cocktail spots in your area!",
        },
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow Tini Time Club to access your camera to take pictures of your Martinis or your profile picture."
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
      [
        "expo-localization"
      ]
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
      environment: process.env.APP_ENV || "development",
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
