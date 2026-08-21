import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import VerdictBlock from "../VerdictBlock";
import { ThemeProvider, lightColors, typography } from "@/theme";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const LABELS = ["Undrinkable", "Forgettable", "Decent", "Enjoyable", "Perfect"];

const render = (ui: React.ReactElement) => {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<ThemeProvider>{ui}</ThemeProvider>);
  });
  return tree!;
};

const texts = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(Text).map((n) => n.props.children);

const build = (value: number, onChange = jest.fn()) =>
  render(
    <VerdictBlock
      eyebrow="Your verdict"
      value={value}
      onChange={onChange}
      labels={LABELS}
      placeholder="Be honest. It can take it."
      accessibilityLabel="Taste rating"
    />
  );

describe("VerdictBlock", () => {
  it("shows the placeholder until something is rated", () => {
    expect(texts(build(0))).toContain("Be honest. It can take it.");
  });

  it("shows the label for the current rating", () => {
    expect(texts(build(4))).toContain("Enjoyable");
    expect(texts(build(1))).toContain("Undrinkable");
    expect(texts(build(5))).toContain("Perfect");
  });

  it("shows a large half rating above the picker in the verdict ink", () => {
    const tree = build(3.5);
    const rating = tree.root
      .findAllByType(Text)
      .find((node) => node.props.children === "3.5");
    const description = tree.root
      .findAllByType(Text)
      .find((node) => node.props.children === "Enjoyable");
    const ratingStyles = [rating?.props.style].flat(3);
    const descriptionStyles = [description?.props.style].flat(3);

    expect(
      ratingStyles.some(
        (style) => style?.fontSize === typography.display.fontSize
      )
    ).toBe(true);
    expect(ratingStyles.findLast((style) => style?.color)?.color).toBe(
      descriptionStyles.findLast((style) => style?.color)?.color
    );
  });

  it("reports the tapped rating", () => {
    const onChange = jest.fn();
    const tree = build(0, onChange);
    const thirdOlive = tree.root.find(
      (n) =>
        n.props.testID === "rating-pip-touch-3" &&
        typeof n.props.onPressIn === "function"
    );

    act(() => {
      thirdOlive.props.onPressIn();
    });
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("inks the block with onBrand, since green on purple fails as text", () => {
    const tree = build(3);
    const inked = tree.root
      .findAllByType(Text)
      .filter((n) =>
        [n.props.style].flat(3).some((s) => s?.color === lightColors.onBrand)
      );
    expect(inked.length).toBeGreaterThan(0);
  });
});
