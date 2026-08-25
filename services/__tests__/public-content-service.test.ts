import { publicContentService } from "@/services/public-content-service";

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
