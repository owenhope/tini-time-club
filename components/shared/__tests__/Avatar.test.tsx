import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text } from "react-native";
import { ThemeProvider } from "@/theme";
import Avatar from "../Avatar";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/utils/imageCache", () => ({
  __esModule: true,
  default: { getAvatarUrlSync: jest.fn(() => null) },
}));

jest.mock("../AvatarRing", () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => children,
}));

describe("Avatar initials", () => {
  it("scales the line box with large fallback initials", () => {
    const size = 84;
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <Avatar username="Another Test" size={size} showRing={false} />
        </ThemeProvider>
      );
    });

    const text = tree!.root.findByType(Text);
    const style = StyleSheet.flatten(text.props.style);

    expect(text.props.children).toBe("A");
    expect(style.lineHeight).toBeGreaterThanOrEqual(style.fontSize);

    act(() => tree!.unmount());
  });
});
