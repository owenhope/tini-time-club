const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  ...expoPreset,
  testPathIgnorePatterns: [
    ...(expoPreset.testPathIgnorePatterns || []),
    "<rootDir>/admin/",
  ],
  setupFiles: ["<rootDir>/jest.setup.js", ...expoPreset.setupFiles],
  resolver: "<rootDir>/jest.resolver.js",
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.includes("standard-navigation")
      ? pattern.replace("standard-navigation", "standard-navigation|uuid")
      : pattern
  ),
};
