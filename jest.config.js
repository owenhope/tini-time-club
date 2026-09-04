const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  ...expoPreset,
  testPathIgnorePatterns: [
    ...(expoPreset.testPathIgnorePatterns || []),
    "<rootDir>/admin/",
  ],
  setupFiles: ["<rootDir>/jest.setup.js", ...expoPreset.setupFiles],
  transformIgnorePatterns: expoPreset.transformIgnorePatterns.map((pattern) =>
    pattern.includes("standard-navigation")
      ? pattern.replace("standard-navigation", "standard-navigation|uuid")
      : pattern
  ),
};
