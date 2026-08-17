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
