import React from "react";
import renderer, { act } from "react-test-renderer";
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

jest.mock("react-native-gesture-handler", () => {
  const React = jest.requireActual("react");
  return {
    PinchGestureHandler: ({ children }: { children: React.ReactNode }) =>
      React.createElement("PinchGestureHandler", null, children),
    State: { ACTIVE: 4 },
  };
});

describe("ReviewImageViewer", () => {
  it("shows the review image and closes on any tap", () => {
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
    // Contain, not a measured stage: layout must not depend on image size.
    expect(image.props.contentFit).toBe("contain");

    const backdrop = tree!.root.find(
      (node) =>
        node.props.accessibilityLabel === "Close review photo" &&
        typeof node.props.onPressIn === "function"
    );
    act(() => backdrop.props.onPressIn());
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
