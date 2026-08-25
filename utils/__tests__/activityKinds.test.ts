import { ACTIVITY_KINDS, isActivityKind } from "@/types/activity";

describe("activity kind model", () => {
  it("accepts every supported notification kind and rejects arbitrary values", () => {
    expect(ACTIVITY_KINDS).toContain("comment_liked");
    expect(isActivityKind("admin_message")).toBe(true);
    expect(isActivityKind("unknown_kind")).toBe(false);
    expect(isActivityKind(null)).toBe(false);
  });
});
