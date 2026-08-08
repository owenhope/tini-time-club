import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, TextInput } from "react-native";
import Search from "../search";
import { ThemeProvider } from "@/theme";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/services/placesService", () => ({
  autocompleteVenues: jest.fn(() => Promise.resolve([])),
  fetchVenue: jest.fn(),
  newSessionToken: jest.fn(() => "session-token"),
}));

const renderSearch = () => {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ThemeProvider>
        <Search currentLocation={null} onPlaceSelected={jest.fn()} />
      </ThemeProvider>
    );
  });
  return tree!;
};

describe("map search", () => {
  it("vertically centers its text and placeholder inside the search field", () => {
    const tree = renderSearch();
    const input = tree.root.findByType(TextInput);
    const style = StyleSheet.flatten(input.props.style);

    expect(style.height).toBe("100%");
    expect(style.paddingVertical).toBe(0);
    expect(style.textAlignVertical).toBe("center");
    expect(style.transform).toEqual([{ translateY: -4 }]);

    act(() => tree.unmount());
  });
});
