import { AdminDataError, toAdminDataError } from "../dataErrors";

describe("admin data errors", () => {
  it("preserves the database error while adding stable operation metadata", () => {
    const error = toAdminDataError(
      {
        message: "permission denied for table profiles",
        code: "42501",
        details: "profiles is restricted",
        hint: "Use the service role client",
      },
      "load profiles"
    );

    expect(error).toBeInstanceOf(AdminDataError);
    expect(error.name).toBe("AdminDataError");
    expect(error.message).toBe("permission denied for table profiles");
    expect(error.operation).toBe("load profiles");
    expect(error.code).toBe("42501");
    expect(error.details).toBe("profiles is restricted");
    expect(error.hint).toBe("Use the service role client");
  });

  it("normalizes network failures without inventing database metadata", () => {
    const error = toAdminDataError(new Error("fetch failed"), "load activity");

    expect(error).toBeInstanceOf(AdminDataError);
    expect(error.message).toBe("fetch failed");
    expect(error.operation).toBe("load activity");
    expect(error.code).toBeNull();
    expect(error.details).toBeNull();
    expect(error.hint).toBeNull();
  });
});
