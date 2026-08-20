import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text, View } from "react-native";
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
  Path: () => null,
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

  it("renders a capped activity count badge", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <AppHeader
            variant="large"
            title="Header"
            actions={[
              {
                icon: "heart-outline",
                badgeCount: 120,
                onPress: jest.fn(),
                accessibilityLabel: "Activity, 120 unread notifications",
              },
            ]}
          />
        </ThemeProvider>
      );
    });

    expect(
      tree!.root
        .findAllByType(Text)
        .some((node) => node.props.children === "99+")
    ).toBe(true);
    act(() => tree!.unmount());
  });

  it("renders a notification dot for pending activity", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <AppHeader
            variant="large"
            title="Header"
            actions={[
              {
                icon: "heart-outline",
                showNotificationDot: true,
                onPress: jest.fn(),
                accessibilityLabel: "Activity, new notifications",
              },
            ]}
          />
        </ThemeProvider>
      );
    });

    expect(
      tree!.root.findAllByType(View).some((node) => {
        const style = StyleSheet.flatten(node.props.style);
        return (
          style?.width === 9 &&
          style?.height === 9 &&
          style?.backgroundColor === darkColors.unread
        );
      })
    ).toBe(true);
    act(() => tree!.unmount());
  });

  it("renders custom controls instead of a title in a compact header", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <AppHeader
            variant="compact"
            title="Hidden title"
            compactContent={<Text>Index filters</Text>}
          />
        </ThemeProvider>
      );
    });

    const text = tree!.root
      .findAllByType(Text)
      .map((node) => node.props.children);
    expect(text).toContain("Index filters");
    expect(text).not.toContain("Hidden title");

    act(() => tree!.unmount());
  });

  it("keeps a modal header as one native child inside a form sheet", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <AppHeader
            variant="modal"
            title="Membership"
            cancelLabel="Close"
            onCancel={jest.fn()}
          />
        </ThemeProvider>
      );
    });

    const header = tree!.root.findAllByType(View)[0];
    expect(header.props.collapsable).toBe(false);
    expect(
      tree!.root.findAllByType(Text).map((node) => node.props.children)
    ).toContain("Close");

    act(() => tree!.unmount());
  });
});
