import type { ConfigContext } from "expo/config";
import createAppConfig from "../../app.config";

const pluginOptions = (
  plugins: ReturnType<typeof createAppConfig>["plugins"],
  name: string
) => {
  const plugin = plugins?.find(
    (entry) => Array.isArray(entry) && entry[0] === name
  );

  if (!Array.isArray(plugin)) {
    throw new Error(`Missing ${name} config plugin`);
  }

  return plugin[1];
};

describe("native app permissions", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("only declares the native capabilities the app uses", () => {
    jest.spyOn(console, "log").mockImplementation(() => {});

    const config = createAppConfig({ config: {} } as ConfigContext);

    expect(config.android?.permissions).not.toContain(
      "android.permission.RECORD_AUDIO"
    );
    expect(pluginOptions(config.plugins, "expo-image-picker")).toMatchObject({
      microphonePermission: false,
      photosPermission: expect.stringContaining("upload Martini review photos"),
    });
    expect(pluginOptions(config.plugins, "expo-camera")).toMatchObject({
      barcodeScannerEnabled: false,
      microphonePermission: false,
      recordAudioAndroid: false,
    });
    expect(pluginOptions(config.plugins, "expo-location")).toMatchObject({
      locationAlwaysAndWhenInUsePermission: false,
      locationAlwaysPermission: false,
      // A purpose string, not false: App Store Connect requires
      // NSMotionUsageDescription because expo-location references
      // CoreMotion APIs (ITMS-90683), and false strips the key at prebuild.
      motionUsagePermission: expect.stringContaining("motion activity"),
    });
    expect(pluginOptions(config.plugins, "expo-secure-store")).toMatchObject({
      faceIDPermission: false,
    });
  });
});

describe("release environment validation", () => {
  const originalAppEnvironment = process.env.APP_ENV;
  const originalBackendEnvironment = process.env.BACKEND_ENV;
  const originalSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const originalMetaAppId = process.env.EXPO_PUBLIC_META_APP_ID;
  const originalSentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  const originalSentryOrg = process.env.SENTRY_ORG;
  const originalSentryProject = process.env.SENTRY_PROJECT;
  const originalSentryAuthToken = process.env.SENTRY_AUTH_TOKEN;
  const originalEasBuild = process.env.EAS_BUILD;

  const setSentryReleaseEnvironment = () => {
    process.env.EXPO_PUBLIC_SENTRY_DSN = "https://public@sentry.example/1";
    process.env.SENTRY_ORG = "tini-time-club";
    process.env.SENTRY_PROJECT = "mobile";
    process.env.SENTRY_AUTH_TOKEN = "test-token";
  };

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.APP_ENV = originalAppEnvironment;
    process.env.BACKEND_ENV = originalBackendEnvironment;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    process.env.EXPO_PUBLIC_META_APP_ID = originalMetaAppId;
    process.env.EXPO_PUBLIC_SENTRY_DSN = originalSentryDsn;
    process.env.SENTRY_ORG = originalSentryOrg;
    process.env.SENTRY_PROJECT = originalSentryProject;
    process.env.SENTRY_AUTH_TOKEN = originalSentryAuthToken;
    if (originalEasBuild === undefined) {
      delete process.env.EAS_BUILD;
    } else {
      process.env.EAS_BUILD = originalEasBuild;
    }
  });

  it.each(["preview", "production"])(
    "rejects a %s build without a Meta app ID",
    (appEnvironment) => {
      jest.spyOn(console, "log").mockImplementation(() => {});
      process.env.APP_ENV = appEnvironment;
      process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      setSentryReleaseEnvironment();
      delete process.env.EXPO_PUBLIC_META_APP_ID;

      expect(() => createAppConfig({ config: {} } as ConfigContext)).toThrow(
        `Missing required ${appEnvironment} environment variables: EXPO_PUBLIC_META_APP_ID`
      );
    }
  );

  it("accepts a preview build when every release variable is present", () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.APP_ENV = "preview";
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.EXPO_PUBLIC_META_APP_ID = "123456789";
    setSentryReleaseEnvironment();

    expect(
      createAppConfig({ config: {} } as ConfigContext).ios?.bundleIdentifier
    ).toBe("com.ohope.tinitimeclub.preview");
  });

  it("rejects a release build on the EAS builder without the Sentry upload token", () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.APP_ENV = "production";
    process.env.EAS_BUILD = "true";
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.EXPO_PUBLIC_META_APP_ID = "123456789";
    setSentryReleaseEnvironment();
    delete process.env.SENTRY_AUTH_TOKEN;

    expect(() => createAppConfig({ config: {} } as ConfigContext)).toThrow(
      "Missing required production environment variables: SENTRY_AUTH_TOKEN"
    );
  });

  it("allows local release config resolution without the secret Sentry token", () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.APP_ENV = "production";
    delete process.env.EAS_BUILD;
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.EXPO_PUBLIC_META_APP_ID = "123456789";
    setSentryReleaseEnvironment();
    delete process.env.SENTRY_AUTH_TOKEN;

    expect(
      createAppConfig({ config: {} } as ConfigContext).ios?.bundleIdentifier
    ).toBe("com.ohope.tinitimeclub");
  });

  it("points the audited production app at the production backend", () => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    process.env.APP_ENV = "production";
    process.env.BACKEND_ENV = "production";
    process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
    process.env.EXPO_PUBLIC_META_APP_ID = "123456789";
    setSentryReleaseEnvironment();

    expect(
      createAppConfig({ config: {} } as ConfigContext).extra?.backendEnvironment
    ).toBe("production");
  });
});
