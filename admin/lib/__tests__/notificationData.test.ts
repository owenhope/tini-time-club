import { groupAdminNotifications } from "../notificationModels";

describe("admin notification grouping", () => {
  it("collapses broadcast rows while preserving recipient and open counts", () => {
    const notifications = groupAdminNotifications(
      [
        {
          id: "n-1",
          created_at: "2026-08-25T10:00:00Z",
          body: "Try the new index entries",
          kind: "admin_message",
          user_id: "member-1",
          event_key: "admin:00000000-0000-4000-8000-000000000001:member-1",
        },
        {
          id: "n-2",
          created_at: "2026-08-25T10:00:00Z",
          body: "Try the new index entries",
          kind: "admin_message",
          user_id: "member-2",
          event_key: "admin:00000000-0000-4000-8000-000000000001:member-2",
        },
        {
          id: "n-3",
          created_at: "2026-08-25T09:00:00Z",
          body: "Your review was liked",
          kind: "review_liked",
          user_id: "member-1",
          event_key: null,
        },
      ],
      new Map([
        ["member-1", "olive"],
        ["member-2", "juniper"],
      ]),
      new Set(["n-1", "n-3"])
    );

    expect(notifications).toEqual([
      {
        id: "00000000-0000-4000-8000-000000000001",
        created_at: "2026-08-25T10:00:00Z",
        body: "Try the new index entries",
        kind: "admin_message",
        username: null,
        recipients: 2,
        opened: 1,
      },
      {
        id: "n-3",
        created_at: "2026-08-25T09:00:00Z",
        body: "Your review was liked",
        kind: "review_liked",
        username: "olive",
        recipients: 1,
        opened: 1,
      },
    ]);
  });
});
