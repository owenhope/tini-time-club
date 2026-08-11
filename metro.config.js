const { getDefaultConfig } = require("expo/metro-config");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");
const {
  wrapWithReanimatedMetroConfig,
} = require("react-native-reanimated/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname, { getDefaultConfig });

module.exports = wrapWithReanimatedMetroConfig(config);
