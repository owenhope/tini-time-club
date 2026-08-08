import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, View } from "react-native";
import AppHeader, {
  type AppHeaderProps,
  type AppHeaderVariant,
} from "../AppHeader";
import { darkColors, ThemeProvider } from "@/theme";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop) {
      if (prop === "useColorScheme") {
        return jest.fn(() => "dark");
      }
      return target[prop];
    },
  });
});

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-router", () => ({
  useFocusEffect: jest.fn(),
}));

jest.mock("expo-status-bar", () => ({
  setStatusBarStyle: jest.fn(),
}));

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: Object.assign(() => null, { glyphMap: {} }),
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("react-native-svg", () => ({
  __esModule: true,
  default: () => null,
  Defs: () => null,
  LinearGradient: () => null,
  Rect: () => null,
  Stop: () => null,
}));

describe("AppHeader dark mode", () => {
  it.each([
    ["large", undefined],
    ["large", "inkDeep"],
    ["media", undefined],
  ] as const)(
    "uses the dark-green ground for the %s %s header universally",
    (variant: AppHeaderVariant, ground: AppHeaderProps["ground"]) => {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <ThemeProvider>
            <AppHeader variant={variant} title="Header" ground={ground} />
          </ThemeProvider>
        );
      });

      const header = tree!.root.findAllByType(View)[0];
      expect(StyleSheet.flatten(header.props.style).backgroundColor).toBe(
        darkColors.tabBar
      );

      act(() => tree!.unmount());
    }
  );

  it("keeps purple brand headers purple", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <AppHeader variant="large" title="Header" ground="brand" />
        </ThemeProvider>
      );
    });

    const header = tree!.root.findAllByType(View)[0];
    expect(StyleSheet.flatten(header.props.style).backgroundColor).toBe(
      darkColors.headerBrand
    );

    act(() => tree!.unmount());
  });
});
