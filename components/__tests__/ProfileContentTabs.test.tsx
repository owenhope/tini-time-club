import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text } from "react-native";
import ProfileContentTabs from "../ProfileContentTabs";
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

jest.mock("@/components/shared", () => ({
  SegmentedControl: jest.requireActual("@/components/shared/SegmentedControl")
    .default,
}));

describe("ProfileContentTabs", () => {
  it.each([
    ["reviews", "Reviews"],
    ["regulars", "Regulars"],
  ] as const)(
    "matches the selected %s tab to the profile header in dark mode",
    (activeTab, label) => {
      let tree: renderer.ReactTestRenderer;
      act(() => {
        tree = renderer.create(
          <ThemeProvider>
            <ProfileContentTabs activeTab={activeTab} onChange={jest.fn()} />
          </ThemeProvider>
        );
      });

      const selectedTab = tree!.root
        .findAll(
          (node) =>
            node.props.accessibilityRole === "tab" &&
            node.props.accessibilityLabel === label
        )
        .find((node) => StyleSheet.flatten(node.props.style)?.backgroundColor);
      const selectedLabel = tree!.root
        .findAllByType(Text)
        .find((node) => node.props.children === label);

      expect(StyleSheet.flatten(selectedTab!.props.style).backgroundColor).toBe(
        darkColors.headerBrand
      );
      expect(StyleSheet.flatten(selectedLabel!.props.style).color).toBe(
        darkColors.onHeaderBrand
      );

      act(() => tree!.unmount());
    }
  );
});
