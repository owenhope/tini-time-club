import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet } from "react-native";
import ReviewImageViewer from "../ReviewImageViewer";
import { ThemeProvider } from "@/theme";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-image", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    Image: (props: any) => React.createElement(View, props),
  };
});

describe("ReviewImageViewer", () => {
  it("shows the review image and closes from the backdrop", () => {
    const onClose = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <ReviewImageViewer
            visible
            imageUrl="https://example.com/review.jpg"
            onClose={onClose}
          />
        </ThemeProvider>
      );
    });

    const image = tree!.root.findByProps({
      accessibilityLabel: "Expanded review photo",
    });
    expect(image.props.source).toEqual({
      uri: "https://example.com/review.jpg",
    });

    act(() => image.props.onLoad({ source: { width: 1200, height: 600 } }));
    const stage = tree!.root.find(
      (node) =>
        node.props.testID === "review-image-stage" &&
        typeof node.props.onPress === "function"
    );
    const stageStyle = StyleSheet.flatten(stage.props.style);
    expect(stageStyle.width / stageStyle.height).toBeCloseTo(2);

    act(() => stage.props.onPress());
    expect(onClose).not.toHaveBeenCalled();

    const backdrop = tree!.root.find(
      (node) =>
        node.props.accessibilityLabel === "Close review photo" &&
        typeof node.props.onPress === "function"
    );
    act(() => backdrop.props.onPress());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
