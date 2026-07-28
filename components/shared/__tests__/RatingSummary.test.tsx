import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import RatingSummary from "../RatingSummary";
import { ThemeProvider } from "@/theme";

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

const textContent = (tree: renderer.ReactTestRenderer): string =>
  tree.root
    .findAllByType(Text)
    .map((node) =>
      node.props.children == null
        ? ""
        : String(
            Array.isArray(node.props.children)
              ? node.props.children.join("")
              : node.props.children
          )
    )
    .join(" ");

// The composed label is the whole accessibility story for this component, so
// it's the thing worth asserting.
const summaryLabel = (tree: renderer.ReactTestRenderer): string => {
  const node = tree.root.findAll(
    (n) => n.props?.accessibilityRole === "summary"
  )[0];
  return node.props.accessibilityLabel;
};

describe("RatingSummary", () => {
  it("states the scale rather than leaving a bare number", () => {
    const tree = render(
      <RatingSummary overall={4.2} taste={4.1} presentation={4.4} />
    );
    expect(textContent(tree)).toContain("out of 5");
  });

  it("composes one screen-reader sentence covering every value", () => {
    const tree = render(
      <RatingSummary
        overall={4.2}
        taste={4.1}
        presentation={4.4}
        reviewCount={47}
      />
    );
    expect(summaryLabel(tree)).toBe(
      "Overall 4.2 out of 5. Taste 4.1 out of 5. Presentation 4.4 out of 5. 47 reviews."
    );
  });

  it("singularises a lone review", () => {
    const tree = render(<RatingSummary overall={5} reviewCount={1} />);
    expect(summaryLabel(tree)).toContain("1 review.");
    expect(summaryLabel(tree)).not.toContain("1 reviews");
  });

  it("says 'not yet rated' instead of showing N/A placeholders", () => {
    const tree = render(<RatingSummary reviewCount={0} />);
    expect(textContent(tree)).toContain("Not yet rated");
    expect(textContent(tree)).not.toContain("N/A");
  });

  it("keeps the review count out of the rating sentence when suppressed", () => {
    const tree = render(
      <RatingSummary overall={4} reviewCount={9} showReviewCount={false} />
    );
    expect(summaryLabel(tree)).not.toContain("9 reviews");
  });

  it("renders one decimal place consistently", () => {
    const tree = render(<RatingSummary overall={4} taste={3.25} />);
    const text = textContent(tree);
    expect(text).toContain("4.0");
    expect(text).toContain("3.3");
  });

  it("compact variant carries the same composed label", () => {
    const tree = render(
      <RatingSummary
        overall={4.2}
        taste={4.1}
        presentation={4.4}
        reviewCount={47}
        variant="compact"
      />
    );
    expect(summaryLabel(tree)).toContain("Overall 4.2 out of 5");
    expect(summaryLabel(tree)).toContain("47 reviews");
  });
});
