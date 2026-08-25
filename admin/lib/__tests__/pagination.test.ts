import { parsePagination } from "../pagination";

describe("parsePagination", () => {
  it("returns the requested positive page and supported page size", () => {
    expect(parsePagination({ page: "3", per: "100" })).toEqual({
      page: 3,
      perPage: 100,
    });
  });

  it("falls back for missing, fractional, negative, and unsupported values", () => {
    expect(parsePagination({ page: "1.5", per: "40" })).toEqual({
      page: 1,
      perPage: 50,
    });
    expect(parsePagination({ page: "-2", per: "25" })).toEqual({
      page: 1,
      perPage: 25,
    });
    expect(parsePagination({})).toEqual({ page: 1, perPage: 50 });
  });
});
