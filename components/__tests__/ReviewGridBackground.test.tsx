import React from "react";
import renderer, { act } from "react-test-renderer";
import { FlatList, StyleSheet, View } from "react-native";
import ReviewGrid from "../ReviewGrid";
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

const mockReact = React;
const MockView = View;

jest.mock("expo-image", () => ({
  Image: (props: Record<string, unknown>) =>
    mockReact.createElement(MockView, { ...props, testID: "review-image" }),
}));

jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
    children,
}));

jest.mock("@/components/ReviewItem", () => () => null);
jest.mock("@/components/CommentsSlider", () => () => null);
jest.mock("@/components/LikeSlider", () => () => null);
jest.mock("@/components/nav/AppHeader", () => () => null);

jest.mock("@/components/shared", () => ({
  RatingPips: () => null,
  Skeleton: () => null,
}));

const reviews = [1, 2, 3].map((id) => ({
  id: String(id),
  image_url: `https://example.com/${id}.jpg`,
  taste: 4,
  presentation: 4,
  profile: { username: `member${id}` },
  location: { name: `Bar ${id}` },
}));

describe("ReviewGrid dark mode", () => {
  it("paints the native list dark so grid gaps cannot show white", () => {
    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <ReviewGrid reviews={reviews as any} />
        </ThemeProvider>
      );
    });

    const list = tree!.root.findByType(FlatList);
    expect(StyleSheet.flatten(list.props.style)?.backgroundColor).toBe(
      darkColors.background
    );

    const tile = tree!.root
      .findAll(
        (node) =>
          node.props.accessibilityRole === "button" &&
          String(node.props.accessibilityLabel).startsWith("Review at")
      )
      .find(
        (node) => StyleSheet.flatten(node.props.style)?.position === "relative"
      );
    const image = tree!.root.findAllByProps({ testID: "review-image" })[0];

    expect(StyleSheet.flatten(tile!.props.style).overflow).toBe("hidden");
    expect(StyleSheet.flatten(image.props.style)).toMatchObject({
      top: -2,
      right: -2,
      bottom: -2,
      left: -2,
    });

    act(() => tree!.unmount());
  });
});
