import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import Svg, { Path } from "react-native-svg";
import RatingPips from "../RatingPips";
import { ThemeProvider } from "@/theme";
import { getOliveIconCanvasSize, OLIVE_ICON_COLOR } from "../OliveIcon";

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

/** The olive body is the shared SVG path used by the app. */
const olives = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(Path).filter((n) => {
    const d = n.props.d;
    return typeof d === "string" && d.startsWith("M400.249 341.459");
  });

describe("RatingPips", () => {
  it("fills whole olives at full opacity", () => {
    const tree = render(<RatingPips value={3} />);
    const filled = olives(tree).filter(
      (n) => n.props.fill === OLIVE_ICON_COLOR
    );
    expect(filled).toHaveLength(3);
    expect(filled.every((n) => n.props.opacity === 1)).toBe(true);
  });

  it("renders a complete fractional olive at proportional opacity", () => {
    const tree = render(<RatingPips value={3.5} />);
    const filled = olives(tree).filter(
      (n) => n.props.fill === OLIVE_ICON_COLOR
    );

    expect(filled).toHaveLength(4);
    expect(filled.map((node) => node.props.opacity)).toEqual([1, 1, 1, 0.5]);
    expect(
      tree.root.findAllByProps({ testID: "rating-pip-partial-fill" })
    ).toHaveLength(0);
  });

  it("shows proportional opacity for aggregate decimal ratings", () => {
    const tree = render(<RatingPips value={3.8} />);
    const filled = olives(tree).filter(
      (n) => n.props.fill === OLIVE_ICON_COLOR
    );

    expect(filled.map((node) => node.props.opacity)).toEqual([1, 1, 1, 0.8]);
  });

  it("omits hollow pips for read-only display ratings", () => {
    const tree = render(<RatingPips value={2} />);
    const hollow = olives(tree).filter((n) => n.props.fill === "transparent");
    expect(hollow).toHaveLength(0);
    expect(olives(tree)).toHaveLength(2);
  });

  it("keeps filled olives in the brand olive colour on dark surfaces", () => {
    const tree = render(<RatingPips value={2} onDark />);
    const filled = olives(tree).filter(
      (n) => n.props.fill === OLIVE_ICON_COLOR
    );

    expect(filled).toHaveLength(2);
  });

  it("shows faint unselected olives for interactive rating controls", () => {
    const tree = render(<RatingPips value={2} onRate={jest.fn()} />);
    const renderedOlives = olives(tree);
    expect(renderedOlives).toHaveLength(5);
    expect(renderedOlives.every((n) => n.props.fill === OLIVE_ICON_COLOR)).toBe(
      true
    );
    expect(renderedOlives.map((n) => n.props.opacity)).toEqual([
      1, 1, 0.3, 0.3, 0.3,
    ]);
    expect(renderedOlives.every((n) => n.props.stroke == null)).toBe(true);
  });

  it("selects the whole numbered rating when an olive is touched", () => {
    const readOnly = render(<RatingPips value={4} />);
    expect(
      readOnly.root.findAll((n) => n.props.accessibilityRole === "adjustable")
    ).toHaveLength(0);

    const onRate = jest.fn();
    const size = 42;
    const interactive = render(
      <RatingPips
        value={1}
        size={size}
        onRate={onRate}
        accessibilityLabel="Taste rating"
      />
    );
    const touchTargets = interactive.root.findAll(
      (n) =>
        typeof n.props.testID === "string" &&
        n.props.testID.startsWith("rating-pip-touch-") &&
        typeof n.props.onPressIn === "function"
    );
    act(() => {
      touchTargets.forEach((target) => {
        target.props.onPressIn();
        target.props.onPressOut();
      });
    });

    expect(touchTargets).toHaveLength(5);
    expect(onRate.mock.calls.map(([rating]) => rating)).toEqual([
      1, 2, 3, 4, 5,
    ]);
  });

  it("selects half ratings while dragging across an olive", () => {
    const onRate = jest.fn();
    const size = 42;
    const tree = render(<RatingPips value={1} size={size} onRate={onRate} />);
    const control = tree.root.find(
      (n) => n.props.accessibilityRole === "adjustable"
    );
    const canvas = getOliveIconCanvasSize(size);
    const thirdPipStart = 2 * (canvas.width + 4);

    act(() => {
      control.props.onTouchMove({
        nativeEvent: { locationX: thirdPipStart + canvas.width * 0.25 },
      });
    });

    expect(onRate).toHaveBeenLastCalledWith(2.5);
  });

  it("updates continuously while dragging across the olives", () => {
    const onRate = jest.fn();
    const size = 42;
    const tree = render(<RatingPips value={1} size={size} onRate={onRate} />);
    const control = tree.root.find(
      (n) => n.props.accessibilityRole === "adjustable"
    );
    const firstOlive = tree.root.find(
      (n) =>
        n.props.testID === "rating-pip-touch-1" &&
        typeof n.props.onPressIn === "function"
    );
    const canvas = getOliveIconCanvasSize(size);
    const fourthPipStart = 3 * (canvas.width + 4);

    act(() => {
      firstOlive.props.onPressIn();
      control.props.onTouchMove({
        nativeEvent: { locationX: fourthPipStart + canvas.width * 0.25 },
      });
      control.props.onTouchMove({
        nativeEvent: { locationX: fourthPipStart + canvas.width * 0.75 },
      });
    });

    expect(onRate.mock.calls.map(([rating]) => rating)).toEqual([1, 3.5, 4]);
  });

  it("supports half-step accessibility adjustments", () => {
    const onRate = jest.fn();
    const tree = render(
      <RatingPips
        value={3}
        onRate={onRate}
        accessibilityLabel="Presentation rating"
      />
    );
    const control = tree.root.find(
      (n) => n.props.accessibilityRole === "adjustable"
    );

    expect(control.props.accessibilityValue).toEqual({
      min: 1,
      max: 5,
      now: 3,
      text: "3.0 out of 5",
    });

    act(() => {
      control.props.onAccessibilityAction({
        nativeEvent: { actionName: "increment" },
      });
    });
    expect(onRate).toHaveBeenLastCalledWith(3.5);
  });

  it("uses 1 as the minimum interactive value", () => {
    const tree = render(<RatingPips value={0} onRate={jest.fn()} showValue />);
    const control = tree.root.find(
      (n) => n.props.accessibilityRole === "adjustable"
    );

    expect(control.props.accessibilityValue).toEqual({
      min: 1,
      max: 5,
      now: 1,
      text: "1.0 out of 5",
    });
    expect(
      tree.root.findAllByType(Text).map((node) => node.props.children)
    ).toContain("1.0");
  });

  it("describes itself for screen readers", () => {
    const tree = render(<RatingPips value={4} />);
    const labelled = tree.root.findAll(
      (n) => n.props.accessibilityLabel === "4 out of 5 olives"
    );
    expect(labelled.length).toBeGreaterThan(0);
  });

  it("pads the olive canvas so the angled body is not clipped", () => {
    const size = 20;
    const tree = render(<RatingPips value={1} size={size} />);
    const svg = tree.root.findByType(Svg);
    const canvas = getOliveIconCanvasSize(size);

    expect(svg.props.width).toBe(canvas.width);
    expect(svg.props.height).toBe(canvas.height);
    expect(canvas.width).toBeGreaterThan(size * 0.84);
    expect(canvas.height).toBeGreaterThan(size);
  });
});
