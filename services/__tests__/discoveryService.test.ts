const mockRpc = jest.fn();

jest.mock("@/utils/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

import {
  getDiscoverLocationsPage,
  getDiscoverProfilesPage,
} from "@/services/discoveryService";

describe("cursor discovery", () => {
  beforeEach(() => mockRpc.mockReset());

  it("passes the opaque profile cursor back to the versioned RPC", async () => {
    const cursor = {
      reviewCount: 10,
      followerCount: 4,
      username: "olive",
      id: "member-1",
    };
    mockRpc.mockResolvedValue({
      data: { items: [], nextCursor: cursor, hasMore: true },
      error: null,
    });

    await expect(
      getDiscoverProfilesPage({ query: "oli", cursor, limit: 25 })
    ).resolves.toEqual({ items: [], nextCursor: cursor, hasMore: true });
    expect(mockRpc).toHaveBeenCalledWith("get_discover_profiles_page_v1", {
      p_cursor: cursor,
      p_limit: 25,
      p_search: "oli",
    });
  });

  it("moves nearby filtering into the location RPC", async () => {
    mockRpc.mockResolvedValue({
      data: { items: [], nextCursor: null, hasMore: false },
      error: null,
    });

    await getDiscoverLocationsPage({
      nearby: { latitude: 49.28, longitude: -123.12, radiusKm: 50 },
    });
    expect(mockRpc).toHaveBeenCalledWith("get_discover_locations_page_v1", {
      p_cursor: null,
      p_latitude: 49.28,
      p_limit: 25,
      p_longitude: -123.12,
      p_query: null,
      p_radius_km: 50,
    });
  });
});
