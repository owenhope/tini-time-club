import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text as SvgText } from "react-native-svg";
import { PassportStamp } from "@/components/passport/passport-stamp";
import type { PassportStampShape } from "@/services/passportService";
import { ThemeProvider } from "@/theme";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const renderStamp = (shape: PassportStampShape, label: string) => {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ThemeProvider>
        <PassportStamp
          shape={shape}
          milestone={1}
          pointAward={10}
          earned
          label={label}
        />
      </ThemeProvider>
    );
  });
  return tree!;
};

const renderedCopy = (tree: renderer.ReactTestRenderer) =>
  tree.root.findAllByType(SvgText).map((node) => node.props.children);

const renderedLabel = (tree: renderer.ReactTestRenderer) =>
  renderedCopy(tree).at(-1) as renderer.ReactTestInstance[];

describe("PassportStamp", () => {
  it.each([
    ["profile_photo", "photo"],
    ["favorite_location", "favorite bar"],
    ["taste_profile", "taste profile"],
    ["bio", "bio"],
  ] as const)("shows %s as a label-only action", (shape, label) => {
    const tree = renderStamp(shape, label);

    expect(renderedCopy(tree)).toEqual(["+10 pts", expect.any(Array)]);
  });

  it("calls the photo action Profile Picture", () => {
    const tree = renderStamp("profile_photo", "photo");

    expect(renderedLabel(tree)[0].props.children).toBe("PROFILE");
    expect(renderedLabel(tree)[1].props.children).toBe("PICTURE");
  });

  it("keeps the milestone number on count-based stamps", () => {
    const tree = renderStamp("locations", "location");

    expect(renderedCopy(tree)).toEqual(["+10 pts", 1, expect.any(Array)]);
  });
});
