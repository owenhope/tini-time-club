import {
  buildAdminNotificationRows,
  chunkNotificationRows,
} from "../notificationBroadcast";

describe("admin notification broadcast", () => {
  it("builds idempotent rows for each member", () => {
    expect(
      buildAdminNotificationRows(["member-1", "member-2"], {
        body: "A new martini note is available.",
        url: "/index",
        broadcastId: "broadcast-1",
      })
    ).toEqual([
      {
        user_id: "member-1",
        body: "A new martini note is available.",
        type: 2,
        kind: "admin_message",
        data: { kind: "admin_message", url: "/index" },
        event_key: "admin:broadcast-1:member-1",
      },
      {
        user_id: "member-2",
        body: "A new martini note is available.",
        type: 2,
        kind: "admin_message",
        data: { kind: "admin_message", url: "/index" },
        event_key: "admin:broadcast-1:member-2",
      },
    ]);
  });

  it("splits a broadcast into bounded insert batches", () => {
    const rows = buildAdminNotificationRows(
      Array.from({ length: 5 }, (_, index) => `member-${index}`),
      { body: "Hello", broadcastId: "broadcast-2" }
    );

    expect(chunkNotificationRows(rows, 2).map((batch) => batch.length)).toEqual(
      [2, 2, 1]
    );
    expect(chunkNotificationRows(rows, 2).flat()).toEqual(rows);
  });
});
