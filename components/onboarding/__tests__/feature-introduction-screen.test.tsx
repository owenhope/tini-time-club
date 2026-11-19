import React from "react";
import {
  act,
  create,
  type ReactTestRenderer,
  type ReactTestRendererJSON,
} from "react-test-renderer";
import FeatureIntroductionScreen from "../feature-introduction-screen";
jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: null }),
}));
jest.mock("@/theme", () => ({ makeStyles: () => () => ({}) }));
jest.mock("@/components/shared", () => ({ AppText: "Text" }));
jest.mock("@/components/passport/passport-stamp", () => ({
  PassportStamp: () => null,
}));
jest.mock("@/components/passport/rank-tier-list", () => ({
  RankTierList: () => null,
}));
jest.mock("../regulars-introduction", () => ({
  RegularsIntroduction: () => null,
}));
jest.mock("../golden-glass-introduction", () => ({
  GoldenGlassIntroduction: () => null,
}));
function checkText(
  node: ReactTestRendererJSON | ReactTestRendererJSON[] | string | null,
  insideText = false
): void {
  if (node === null) return;
  if (typeof node === "string") {
    expect(insideText).toBe(true);
    return;
  }
  if (Array.isArray(node)) {
    node.forEach((child) => checkText(child, insideText));
    return;
  }
  const text = insideText || node.type === "Text";
  node.children?.forEach((child) => checkText(child, text));
}
it.each(["passport", "rankings", "regulars", "golden-glass"] as const)(
  "renders %s without text outside native Text",
  (feature) => {
    let renderer: ReactTestRenderer;
    act(() => {
      renderer = create(<FeatureIntroductionScreen feature={feature} />);
    });
    try {
      checkText(renderer!.toJSON());
    } finally {
      act(() => renderer!.unmount());
    }
  }
);
