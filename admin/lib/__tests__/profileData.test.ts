import { enrichAdminProfile } from "../profileModels";

describe("admin profile enrichment", () => {
  it("adds auth metadata without replacing profile fields", () => {
    expect(
      enrichAdminProfile(
        {
          id: "member-1",
          username: "olive",
          name: "Olive",
          avatar_url: null,
          is_verified: true,
          deleted: false,
          deleted_at: null,
          review_count: 12,
          bio: "Likes a cold martini",
        },
        {
          email: "olive@example.com",
          created_at: "2026-08-01T12:00:00Z",
          last_sign_in_at: "2026-08-25T09:00:00Z",
        }
      )
    ).toEqual({
      id: "member-1",
      username: "olive",
      name: "Olive",
      avatar_url: null,
      is_verified: true,
      deleted: false,
      deleted_at: null,
      review_count: 12,
      bio: "Likes a cold martini",
      email: "olive@example.com",
      created_at: "2026-08-01T12:00:00Z",
      last_sign_in_at: "2026-08-25T09:00:00Z",
    });
  });
});
