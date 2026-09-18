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

  it("normalizes discovered members and retains pagination and ordering", async () => {
    const cursor = { id: "member-3" };
    mockRpc.mockResolvedValue({
      data: {
        items: [
          {
            id: "member-1",
            username: "olive",
            passport_points: 500,
            review_count: 2,
            follower_count: 8,
          },
          { id: "member-2", username: "twist", passport_points: 0 },
          { id: "member-3", username: "dry" },
          { id: " " },
        ],
        nextCursor: cursor,
        hasMore: true,
      },
      error: null,
    });
    const page = await getDiscoverProfilesPage();
    expect(page.items.map((member) => member.passport_points)).toEqual([
      500,
      0,
      null,
    ]);
    expect(page.items[0]).toMatchObject({ review_count: 2, follower_count: 8 });
    expect(page.nextCursor).toEqual(cursor);
    expect(page.hasMore).toBe(true);
  });

  it("decodes embedded regulars through the same member contract", async () => {
    mockRpc.mockResolvedValue({
      data: {
        items: [
          {
            id: 42,
            is_golden_glass: false,
            is_location_verified: false,
            regulars: [
              {
                location_id: 42,
                rank: 1,
                profile_id: "member-1",
                username: "olive",
                review_count: 3,
                profile_review_count: 20,
                passport_points: 500,
              },
              {
                location_id: 42,
                rank: 2,
                profile_id: "member-2",
                username: "twist",
                review_count: 2,
              },
            ],
          },
        ],
      },
      error: null,
    });
    const page = await getDiscoverLocationsPage({});
    expect(page.items[0].regulars[0]).toMatchObject({
      passport_points: 500,
      profile_review_count: 20,
      review_count: 3,
      rank: 1,
    });
    expect(page.items[0].regulars[1].passport_points).toBeNull();
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
