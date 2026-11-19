const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  ...expoPreset,
  testPathIgnorePatterns: [
    ...(expoPreset.testPathIgnorePatterns || []),
    "<rootDir>/admin/",
  ],
  setupFiles: [
    "<rootDir>/jest.setup.js",
    ...expoPreset.setupFiles,
    // Gesture Handler 3's native module mock (configureRelations etc.).
    "react-native-gesture-handler/jestSetup",
  ],
  resolver: "<rootDir>/jest.resolver.js",
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.includes("standard-navigation")
      ? pattern.replace("standard-navigation", "standard-navigation|uuid")
      : pattern
  ),
};
