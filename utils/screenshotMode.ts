import Constants from "expo-constants";

type ExtraConfig = Record<string, unknown> | undefined;

const getExtra = (): ExtraConfig => {
  const expoExtra = Constants.expoConfig?.extra as ExtraConfig;
  const manifestExtra = Constants.manifest2?.extra as
    { expoClient?: { extra?: ExtraConfig } } | undefined;

  return expoExtra ?? manifestExtra?.expoClient?.extra;
};

const getParamValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

export const isDevelopmentBackend = () =>
  getExtra()?.backendEnvironment === "development";

export const getScreenshotSeed = (
  value: string | string[] | undefined
): string | null => {
  if (!__DEV__ || !isDevelopmentBackend()) return null;
  return getParamValue(value) ?? null;
};

export const isScreenshotSeed = (
  value: string | string[] | undefined,
  expected: string
) => getScreenshotSeed(value) === expected;
