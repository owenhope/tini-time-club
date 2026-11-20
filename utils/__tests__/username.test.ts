import { getUsernameError, nextUsernameChangeAt } from "@/utils/username";

// bad-words ships ESM that Jest can't load; the word list isn't under test.
jest.mock("bad-words", () => ({
  Filter: jest.fn().mockImplementation(() => ({
    isProfane: (value: string) => value === "badword",
  })),
}));

describe("getUsernameError", () => {
  it("accepts letters, numbers and underscores", () => {
    expect(getUsernameError("dry_martini_42")).toBeNull();
  });

  it("rejects short, long and punctuated names", () => {
    expect(getUsernameError("ab")).toMatch(/at least 3/);
    expect(getUsernameError("a".repeat(21))).toMatch(/20 characters/);
    expect(getUsernameError("dry martini")).toMatch(/letters, numbers/);
  });

  it("rejects profane names", () => {
    expect(getUsernameError("badword")).toMatch(/different username/);
  });
});

describe("nextUsernameChangeAt", () => {
  const now = new Date("2026-11-20T12:00:00Z");

  it("allows a rename when the member has never renamed", () => {
    expect(nextUsernameChangeAt(null, now)).toBeNull();
    expect(nextUsernameChangeAt(undefined, now)).toBeNull();
  });

  it("locks renames for 3 calendar months", () => {
    expect(
      nextUsernameChangeAt("2026-10-01T09:30:00Z", now)?.toISOString()
    ).toBe("2027-01-01T09:30:00.000Z");
  });

  it("clamps to the end of a shorter month like Postgres", () => {
    expect(
      nextUsernameChangeAt("2026-11-30T00:00:00Z", now)?.toISOString()
    ).toBe("2027-02-28T00:00:00.000Z");
  });

  it("allows a rename once the 3 months have passed", () => {
    expect(nextUsernameChangeAt("2026-08-19T12:00:00Z", now)).toBeNull();
  });
});
