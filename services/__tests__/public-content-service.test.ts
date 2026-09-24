import { publicContentService } from "@/services/public-content-service";
import { isNetworkError } from "@/utils/log";
import { FunctionsFetchError, FunctionsHttpError } from "@supabase/supabase-js";

const mockInvoke = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => mockInvoke(...args) },
  },
}));

describe("publicContentService", () => {
  beforeEach(() => {
    mockInvoke.mockReset();
    mockInvoke.mockResolvedValue({ data: { data: [] }, error: null });
  });

  it("preserves Edge Function transport failures for network classification", async () => {
    const cause = new FunctionsFetchError(
      new TypeError("Network request failed")
    );
    mockInvoke.mockResolvedValue({ data: null, error: cause });
    const error = await publicContentService
      .getFeed()
      .catch((value: unknown) => value);
    expect(isNetworkError(error)).toBe(true);
    expect(error).toMatchObject({ name: "PublicContentError", cause });
  });

  it("keeps Edge Function HTTP failures reportable", async () => {
    const cause = new FunctionsHttpError({ status: 500 });
    mockInvoke.mockResolvedValue({ data: null, error: cause });
    const error = await publicContentService
      .getFeed()
      .catch((value: unknown) => value);
    expect(isNetworkError(error)).toBe(false);
    expect(error).toMatchObject({ name: "PublicContentError", cause });
  });

  it("keeps map viewport reads global instead of attaching the selected region", async () => {
    await publicContentService.getLocationsInView({
      minLat: 49.2,
      minLong: -123.2,
      maxLat: 49.4,
      maxLong: -123.0,
    });

    expect(mockInvoke).toHaveBeenCalledWith("public-content", {
      body: {
        operation: "locations-in-view",
        minLat: 49.2,
        minLong: -123.2,
        maxLat: 49.4,
        maxLong: -123,
      },
    });
  });
});
