import React from "react";
import renderer, { act } from "react-test-renderer";
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
  it("fills whole olives at full opacity", () => {
    const tree = render(<RatingPips value={3} />);
    const filled = olives(tree).filter((n) => n.props.fill === OLIVE_ICON_COLOR);
    expect(filled).toHaveLength(3);
    expect(filled.every((n) => n.props.opacity === 1)).toBe(true);
  });

  it("uses opacity for the fractional olive", () => {
    const tree = render(<RatingPips value={3.5} />);
    const filled = olives(tree).filter((n) => n.props.fill === OLIVE_ICON_COLOR);
    expect(filled).toHaveLength(4);
    expect(filled.map((n) => n.props.opacity)).toEqual([1, 1, 1, 0.5]);
  });

  it("caps high fractional olive opacity so decimals do not look whole", () => {
    const tree = render(<RatingPips value={3.8} />);
    const filled = olives(tree).filter((n) => n.props.fill === OLIVE_ICON_COLOR);

    expect(filled.map((n) => n.props.opacity)).toEqual([1, 1, 1, 0.55]);
  });

  it("keeps high fractional values distinct from whole olives", () => {
    const tree = render(<RatingPips value={4.8} />);
    const filled = olives(tree).filter((n) => n.props.fill === OLIVE_ICON_COLOR);
    expect(filled.map((n) => n.props.opacity)).toEqual([1, 1, 1, 1, 0.55]);
  });

  it("omits hollow pips for read-only display ratings", () => {
    const tree = render(<RatingPips value={2} />);
    const hollow = olives(tree).filter((n) => n.props.fill === "transparent");
    expect(hollow).toHaveLength(0);
    expect(olives(tree)).toHaveLength(2);
  });

  it("keeps filled olives in the brand olive colour on dark surfaces", () => {
    const tree = render(<RatingPips value={2} onDark />);
    const filled = olives(tree).filter((n) => n.props.fill === OLIVE_ICON_COLOR);

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
