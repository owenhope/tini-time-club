import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text } from "react-native";
import LocationDetails from "../locationDetails";
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
  Link: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/components/shared", () => ({
  Avatar: () => null,
  RatingPips: () => null,
}));

describe("location details", () => {
  it("uses white for the overall score in dark mode", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <LocationDetails
            loc={{
              id: 1,
              name: "The Martini Room",
              address: "123 Main Street, Vancouver, BC",
              rating: 4.2,
              total_ratings: 12,
            }}
          />
        </ThemeProvider>
      );
    });

    const score = tree!.root
      .findAllByType(Text)
      .find((node) => node.props.children === "4.2");

    expect(StyleSheet.flatten(score!.props.style).color).toBe(
      darkColors.textSecondary
    );

    act(() => tree!.unmount());
  });
});
