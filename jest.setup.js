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

// The native tab bar inset hook needs a SafeAreaProvider; component tests
// render without one, so give every suite the same neutral inset.
jest.mock("@/utils/native-tab-bar-insets", () => ({
  useNativeTabBarContentInset: () => 0,
}));
