import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text, TextInput, TouchableOpacity } from "react-native";
import {
  ExploreSearchArea,
  ExploreSearchField,
} from "@/components/explore/ExploreSearchField";
import { ThemeProvider } from "@/theme";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

describe("ExploreSearchField", () => {
  it("provides the same field geometry and header area to every mode", () => {
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <ExploreSearchArea>
            <ExploreSearchField
              value=""
              onChangeText={jest.fn()}
              placeholder="Search members"
            />
          </ExploreSearchArea>
        </ThemeProvider>
      );
    });

    const input = tree!.root.findByType(TextInput);
    const inputStyle = StyleSheet.flatten(input.props.style);
    const field = input.parent as renderer.ReactTestInstance;
    const fieldStyle = StyleSheet.flatten(field.props.style);

    expect(fieldStyle.height).toBe(48);
    expect(inputStyle.height).toBe("100%");
    expect(inputStyle.paddingVertical).toBe(0);
    expect(input.props.returnKeyType).toBe("search");

    act(() => tree!.unmount());
  });

  it("supports the shared clear action and mode-specific trailing control", () => {
    const onClear = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <ExploreSearchField
            value="tini"
            onChangeText={jest.fn()}
            placeholder="Search top places"
            onClear={onClear}
            trailing={<Text>Nearby</Text>}
          />
        </ThemeProvider>
      );
    });

    expect(tree!.root.findByProps({ children: "Nearby" })).toBeTruthy();
    const clearButton = tree!.root
      .findAllByType(TouchableOpacity)
      .find((node) => node.props.accessibilityLabel === "Clear search");

    expect(clearButton).toBeTruthy();
    act(() => clearButton!.props.onPress());
    expect(onClear).toHaveBeenCalledTimes(1);

    act(() => tree!.unmount());
  });
});
