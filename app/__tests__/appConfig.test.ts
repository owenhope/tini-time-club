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
      motionUsagePermission: false,
    });
    expect(pluginOptions(config.plugins, "expo-secure-store")).toMatchObject({
      faceIDPermission: false,
    });
  });
});

describe("release environment validation", () => {
  const originalAppEnvironment = process.env.APP_ENV;
  const originalSupabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const originalSupabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  const originalMetaAppId = process.env.EXPO_PUBLIC_META_APP_ID;

  afterEach(() => {
    jest.restoreAllMocks();
    process.env.APP_ENV = originalAppEnvironment;
    process.env.EXPO_PUBLIC_SUPABASE_URL = originalSupabaseUrl;
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = originalSupabaseAnonKey;
    process.env.EXPO_PUBLIC_META_APP_ID = originalMetaAppId;
  });

  it.each(["preview", "production"])(
    "rejects a %s build without a Meta app ID",
    (appEnvironment) => {
      jest.spyOn(console, "log").mockImplementation(() => {});
      process.env.APP_ENV = appEnvironment;
      process.env.EXPO_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key";
      delete process.env.EXPO_PUBLIC_META_APP_ID;

      expect(() =>
        createAppConfig({ config: {} } as ConfigContext)
      ).toThrow(
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

    expect(
      createAppConfig({ config: {} } as ConfigContext).ios?.bundleIdentifier
    ).toBe("com.ohope.tinitimeclub.preview");
  });
});
