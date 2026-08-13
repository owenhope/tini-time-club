import {
  groupActivityEvents,
  sectionActivityRows,
} from "@/utils/activityGrouping";
import type { ActivityEvent } from "@/types/activity";

const actor = (id: string, username: string) => ({
  id,
  username,
  avatarUrl: null,
  isVerified: false,
  reviewCount: 1,
});

const event = (overrides: Partial<ActivityEvent>): ActivityEvent => ({
  id: "notification-1",
  createdAt: "2026-08-13T12:00:00.000Z",
  kind: "review_liked",
  body: null,
  actor: actor("actor-1", "morgan"),
  isFollowing: false,
  review: {
    id: "42",
    imagePath: null,
    imageUrl: null,
    locationId: null,
  },
  comment: null,
  data: { url: "/r/42" },
  seenAt: null,
  readAt: null,
  ...overrides,
});

describe("Activity grouping", () => {
  it("groups likes for the same review inside 24 hours", () => {
    const rows = groupActivityEvents([
      event({ id: "one" }),
      event({
        id: "two",
        createdAt: "2026-08-13T01:00:00.000Z",
        actor: actor("actor-2", "riley"),
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0].notificationIds).toEqual(["one", "two"]);
    expect(rows[0].kind).toBe("review_liked");
    if (rows[0].kind === "review_liked") {
      expect(rows[0].summary).toBe("morgan and 1 others liked your review");
    }
  });

  it("does not group likes outside the time window", () => {
    const rows = groupActivityEvents([
      event({ id: "one" }),
      event({
        id: "two",
        createdAt: "2026-08-11T12:00:00.000Z",
      }),
    ]);
    expect(rows).toHaveLength(2);
  });

  it("keeps grouped IDs unread and under New when any member is new", () => {
    const rows = groupActivityEvents(
      [
        event({ id: "one", readAt: new Date().toISOString() }),
        event({ id: "two" }),
      ],
      new Set(["two"])
    );
    const sections = sectionActivityRows(rows);
    expect(sections.map((section) => section.title)).toEqual(["New"]);
    expect(rows[0].isUnread).toBe(true);
    expect(rows[0].isNew).toBe(true);
  });

  it("renders comment previews and admin messages as separate rows", () => {
    const rows = groupActivityEvents([
      event({
        id: "comment",
        kind: "review_commented",
        actor: actor("actor-2", "riley"),
        comment: { id: "comment-1", body: "  Great drink!  " },
      }),
      event({
        id: "admin",
        kind: "admin_message",
        actor: null,
        review: null,
        body: "Club update",
        data: {},
      }),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.find((row) => row.kind === "review_commented")).toMatchObject({
      preview: "Great drink!",
    });
    expect(rows.find((row) => row.kind === "admin_message")).toMatchObject({
      body: "Club update",
    });
  });
});
