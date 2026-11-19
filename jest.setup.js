class TestFormData {
  constructor() {
    this._parts = [];
  }

  append(name, value) {
    this._parts.push([String(name), value]);
  }
}

global.FormData = global.FormData || TestFormData;
require("whatwg-fetch");

// Reanimated's native worklets runtime does not exist under Jest; use the
// official mock so components that animate (AvatarRing etc.) can render.
jest.mock("react-native-reanimated", () =>
  require("react-native-reanimated/mock")
);

// Gesture Handler 3 asks worklets for the UI runtime in a microtask on import;
// Jest only has the JS worklets build, which throws for that call.
jest.mock("react-native-worklets", () => ({
  ...jest.requireActual("react-native-worklets"),
  getUIRuntimeHolder: () => ({}),
}));

// The native tab bar inset hook needs a SafeAreaProvider; component tests
// render without one, so give every suite the same neutral inset.
jest.mock("@/utils/native-tab-bar-insets", () => ({
  useNativeTabBarContentInset: () => 0,
}));
