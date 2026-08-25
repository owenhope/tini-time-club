import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text, View } from "react-native";
import AppHeader from "../AppHeader";
import { compactDisplayTypography, darkColors, ThemeProvider } from "@/theme";

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

jest.mock("@expo/vector-icons", () => {
  const ReactActual = jest.requireActual("react");
  return {
    Ionicons: Object.assign(
      (props: object) => ReactActual.createElement("Ionicons", props),
      { glyphMap: {} }
    ),
  };
});

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

describe("AppHeader", () => {
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

    const countText = tree!.root
      .findAllByType(Text)
      .find((node) => node.props.children === "99+");
    expect(StyleSheet.flatten(countText!.props.style)?.color).toBe(
      darkColors.onInk
    );

    const badge = tree!.root.findAllByType(View).find((node) => {
      const style = StyleSheet.flatten(node.props.style);
      return style?.minWidth === 20 && style?.height === 20;
    });
    expect(badge).toBeDefined();
    expect(StyleSheet.flatten(badge!.props.style)?.borderWidth).toBeUndefined();
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

  it("supports a one-point smaller media title", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <AppHeader
            variant="media"
            title="Pier 7 Restaurant + Bar"
            mediaTitleSize="compact"
          />
        </ThemeProvider>
      );
    });

    const title = tree!.root
      .findAllByType(Text)
      .find((node) => node.props.children === "Pier 7 Restaurant + Bar");
    const style = StyleSheet.flatten(title?.props.style);

    expect(style?.fontSize).toBe(compactDisplayTypography.fontSize);
    expect(style?.lineHeight).toBe(compactDisplayTypography.lineHeight);

    act(() => tree!.unmount());
  });

  it("renders compact back chevrons in the dark theme foreground", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <AppHeader variant="compact" title="Settings" onBack={jest.fn()} />
        </ThemeProvider>
      );
    });

    const backIcon = tree!.root.findByType("Ionicons" as React.ElementType);
    expect(backIcon.props.name).toBe("chevron-back");
    expect(backIcon.props.color).toBe(darkColors.text);

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
