import React from "react";
import renderer, { act } from "react-test-renderer";
import { View } from "react-native";
import RatingPips from "../RatingPips";
import { ThemeProvider, lightColors } from "@/theme";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const render = (ui: React.ReactElement) => {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(<ThemeProvider>{ui}</ThemeProvider>);
  });
  return tree!;
};

/** An olive body is the only View carrying the accent (or transparent) fill. */
const olives = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(View).filter((n) => {
    const s = n.props.style;
    return s && !Array.isArray(s) && typeof s.borderRadius === "string";
  });

/** The per-olive rate buttons, found by role rather than component type —
 *  the RN jest preset does not preserve Pressable's identity. */
const rateButtons = (tree: renderer.ReactTestRenderer) => {
  const seen = new Set<string>();
  return (
    tree.root
      .findAll(
        (n) =>
          typeof n.props.onPress === "function" &&
          typeof n.props.accessibilityLabel === "string" &&
          n.props.accessibilityLabel.startsWith("Rate ")
      )
      // Pressable renders several nodes carrying the same props; keep one per pip.
      .filter((n) => {
        const label = n.props.accessibilityLabel as string;
        if (seen.has(label)) return false;
        seen.add(label);
        return true;
      })
  );
};

describe("RatingPips", () => {
  it("fills pips up to the rounded value", () => {
    const tree = render(<RatingPips value={3} />);
    const filled = olives(tree).filter(
      (n) => n.props.style.backgroundColor === lightColors.secondary
    );
    expect(filled).toHaveLength(3);
  });

  it("rounds halves to the nearest whole olive", () => {
    const tree = render(<RatingPips value={3.5} />);
    const filled = olives(tree).filter(
      (n) => n.props.style.backgroundColor === lightColors.secondary
    );
    expect(filled).toHaveLength(4);
  });

  it("renders hollow pips for the remainder", () => {
    const tree = render(<RatingPips value={2} />);
    const hollow = olives(tree).filter(
      (n) => n.props.style.backgroundColor === "transparent"
    );
    expect(hollow).toHaveLength(3);
  });

  it("is only tappable when onRate is supplied", () => {
    const readOnly = render(<RatingPips value={4} />);
    expect(rateButtons(readOnly)).toHaveLength(0);

    const onRate = jest.fn();
    const interactive = render(<RatingPips value={0} onRate={onRate} />);
    const buttons = rateButtons(interactive);
    expect(buttons).toHaveLength(5);

    act(() => {
      buttons[3].props.onPress();
    });
    expect(onRate).toHaveBeenCalledWith(4);
  });

  it("describes itself for screen readers", () => {
    const tree = render(<RatingPips value={4} />);
    const labelled = tree.root.findAll(
      (n) => n.props.accessibilityLabel === "4 out of 5 olives"
    );
    expect(labelled.length).toBeGreaterThan(0);
  });
});
