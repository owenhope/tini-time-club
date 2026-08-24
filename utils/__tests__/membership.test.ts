import {
  getMembershipPromptCopy,
  getVisitorGatedRouteIntent,
  safeMembershipReturnPath,
} from "@/utils/membership";

describe("membership prompt contract", () => {
  it("uses contextual copy for gated actions", () => {
    expect(getMembershipPromptCopy("review").title).toMatch(/verdict/i);
    expect(getMembershipPromptCopy("pick-one").body).toMatch(/members-only/i);
    expect(getMembershipPromptCopy("share-review").title).toMatch(/sharing/i);
    expect(getMembershipPromptCopy("golden-glass").title).toMatch(
      /glass list/i
    );
    expect(getMembershipPromptCopy("members-directory").title).toMatch(/club/i);
    expect(getMembershipPromptCopy("location-details").title).toMatch(/map/i);
  });

  it("falls back safely for an unknown intent", () => {
    expect(getMembershipPromptCopy("unknown").title).toBe("Join the club");
  });

  it("accepts only internal non-auth return destinations", () => {
    expect(safeMembershipReturnPath("/places/42")).toBe("/places/42");
    expect(safeMembershipReturnPath("https://example.com")).toBeNull();
    expect(safeMembershipReturnPath("//example.com")).toBeNull();
    expect(safeMembershipReturnPath("/auth/email")).toBeNull();
    expect(safeMembershipReturnPath("/membership")).toBeNull();
  });

  it("maps member-only deep links onto the right conversion intent", () => {
    expect(getVisitorGatedRouteIntent("/review")).toBe("review");
    expect(getVisitorGatedRouteIntent("/review-share-preview")).toBe(
      "share-review"
    );
    expect(getVisitorGatedRouteIntent("/activity")).toBe("activity");
    expect(getVisitorGatedRouteIntent("/users/olive/followers")).toBe(
      "social-list"
    );
    expect(getVisitorGatedRouteIntent("/places/42")).toBeNull();
  });
});
