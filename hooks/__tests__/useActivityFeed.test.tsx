import React from "react";
import renderer, { act } from "react-test-renderer";
import { type ActivityFeed, useActivityFeed } from "@/hooks/useActivityFeed";
import { fetchActivityPage } from "@/services/activityService";
import { writeActivityCache } from "@/utils/activityCache";
import type { ActivityPage } from "@/types/activity";

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: { id: "viewer-1" } }),
}));

jest.mock("@/services/activityService", () => ({
  fetchActivityPage: jest.fn(),
  markActivitySeenThrough: jest.fn(() => Promise.resolve()),
  subscribeToActivityChanges: jest.fn(() => jest.fn()),
}));

jest.mock("@/services/followService", () => ({
  setFollowing: jest.fn(() => Promise.resolve()),
}));

jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

jest.mock("@/utils/activityCache", () => ({
  readActivityCache: jest.fn(() => Promise.resolve(null)),
  writeActivityCache: jest.fn(),
}));

jest.mock("@/utils/log", () => ({
  reportError: jest.fn(),
}));

const fetchPage = fetchActivityPage as jest.MockedFunction<
  typeof fetchActivityPage
>;
const writeCache = writeActivityCache as jest.MockedFunction<
  typeof writeActivityCache
>;

const page: ActivityPage = {
  events: [
    {
      id: "activity-1",
      createdAt: "2026-08-14T16:00:00.000Z",
      kind: "admin_message",
      body: "Welcome to Activity",
      actor: null,
      isFollowing: false,
      review: null,
      comment: null,
      data: {},
      seenAt: "2026-08-14T16:01:00.000Z",
      readAt: null,
    },
  ],
  nextCursor: null,
  hasMore: false,
  snapshotAt: "2026-08-14T16:01:00.000Z",
};

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
};

describe("useActivityFeed initial loading", () => {
  it("does not mount the ready list with pull-to-refresh active", async () => {
    const pageRequest = deferred<ActivityPage>();
    fetchPage.mockReturnValue(pageRequest.promise);
    writeCache.mockReturnValue(new Promise<void>(() => {}));

    let latest: ActivityFeed | undefined;
    const Harness = () => {
      latest = useActivityFeed();
      return null;
    };

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<Harness />);
    });

    await act(async () => {
      pageRequest.resolve(page);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(latest?.state).toBe("ready");
    expect(latest?.refreshing).toBe(false);

    act(() => tree!.unmount());
  });
});
