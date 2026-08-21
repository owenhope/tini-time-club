import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text } from "react-native";
import { ThemeProvider, typography } from "@/theme";
import AppText from "../AppText";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

describe("AppText typography seam", () => {
  it("applies the selected semantic role with caller layout and color", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <AppText
            variant="body"
            style={{
              color: "#123456",
              textAlign: "center",
            }}
          >
            Martini
          </AppText>
        </ThemeProvider>
      );
    });

    const style = StyleSheet.flatten(tree!.root.findByType(Text).props.style);
    expect(style).toMatchObject({
      ...typography.body,
      color: "#123456",
      textAlign: "center",
    });

    act(() => tree!.unmount());
  });
});
