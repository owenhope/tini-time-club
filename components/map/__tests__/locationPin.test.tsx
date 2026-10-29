import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, View } from "react-native";
import LocationPin from "../locationPin";
import { darkColors, ThemeProvider } from "@/theme";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop) {
      if (prop === "useColorScheme") return jest.fn(() => "dark");
      return target[prop];
    },
  });
});
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));
jest.mock("@expo/vector-icons", () => {
  const ReactActual = jest.requireActual("react");
  return {
    MaterialIcons: (props: object) =>
      ReactActual.createElement("MaterialIcons", props),
  };
});
jest.mock("@/components/shared", () => ({
  MartiniIcon: () => null,
}));

const place = (is_golden_glass: boolean) => ({
  id: 1,
  name: "Little Vesper",
  lat: 49.31,
  long: -123.08,
  rating: 4.2,
  total_ratings: 6,
  is_golden_glass,
});

const render = (element: React.ReactElement) => {
  let tree!: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<ThemeProvider>{element}</ThemeProvider>);
  });
  return tree;
};
const ringColor = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAllByType(View)
    .map((node) => StyleSheet.flatten(node.props.style))
    .find((style) => style?.borderWidth === 3)?.borderColor;
const heart = (tree: renderer.ReactTestRenderer) =>
  tree.root
    .findAllByType("MaterialIcons" as React.ElementType)
    .find((icon) => icon.props.name === "favorite");

describe("LocationPin", () => {
  it("turns a liked place pink", () => {
    const tree = render(<LocationPin loc={place(false)} favorite />);
    expect(ringColor(tree)).toBe(darkColors.favorite);
    expect(heart(tree)).toBeUndefined();
    act(() => tree.unmount());
  });

  it("keeps a liked Golden Glass place gold, with a heart on its corner", () => {
    const tree = render(<LocationPin loc={place(true)} favorite />);
    expect(ringColor(tree)).toBe(darkColors.awardGold);
    expect(heart(tree)?.props.color).toBe(darkColors.favorite);
    act(() => tree.unmount());
  });

  it("gives an unliked Golden Glass place no heart", () => {
    const tree = render(<LocationPin loc={place(true)} />);
    expect(ringColor(tree)).toBe(darkColors.awardGold);
    expect(heart(tree)).toBeUndefined();
    act(() => tree.unmount());
  });
});
