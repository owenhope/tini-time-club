const expoPreset = require("jest-expo/jest-preset");

module.exports = {
  ...expoPreset,
  setupFiles: ["<rootDir>/jest.setup.js", ...expoPreset.setupFiles],
};
