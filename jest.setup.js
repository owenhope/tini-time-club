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

// The native tab bar inset hook needs a SafeAreaProvider; component tests
// render without one, so give every suite the same neutral inset.
jest.mock("@/utils/native-tab-bar-insets", () => ({
  useNativeTabBarContentInset: () => 0,
}));
