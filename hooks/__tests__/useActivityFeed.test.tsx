import React from "react";
import renderer, { act } from "react-test-renderer";
import { type ActivityFeed, useActivityFeed } from "@/hooks/useActivityFeed";
import { fetchActivityPage } from "@/services/activityService";
import { writeActivityCache } from "@/utils/activityCache";
import type { ActivityPage } from "@/types/activity";

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({
    profile: mockActiveProfileId ? { id: mockActiveProfileId } : null,
  }),
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

let mockActiveProfileId: string | undefined = "viewer-1";

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

  it("ignores an earlier profile's load-more response after the viewer changes", async () => {
    const initialRequest = deferred<ActivityPage>();
    const oldLoadMoreRequest = deferred<ActivityPage>();
    const newProfileRequest = deferred<ActivityPage>();
    fetchPage.mockReset();
    writeCache.mockReset();
    writeCache.mockResolvedValue(undefined);
    fetchPage
      .mockReturnValueOnce(initialRequest.promise)
      .mockReturnValueOnce(oldLoadMoreRequest.promise)
      .mockReturnValueOnce(newProfileRequest.promise);

    const initialPage: ActivityPage = {
      ...page,
      events: page.events,
      nextCursor: {
        createdAt: page.events[0].createdAt,
        id: page.events[0].id,
      },
      hasMore: true,
    };
    const oldEvent = { ...page.events[0], id: "old-profile-event" };
    const newEvent = { ...page.events[0], id: "new-profile-event" };

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
      initialRequest.resolve(initialPage);
      await initialRequest.promise;
    });

    await act(async () => {
      void latest!.loadMore();
      await Promise.resolve();
    });

    mockActiveProfileId = "viewer-2";
    act(() => {
      tree!.update(<Harness />);
    });

    await act(async () => {
      oldLoadMoreRequest.resolve({
        ...page,
        events: [oldEvent],
        nextCursor: null,
        hasMore: false,
      });
      await oldLoadMoreRequest.promise;
    });

    expect(JSON.stringify(latest?.sections)).not.toContain("old-profile-event");

    await act(async () => {
      newProfileRequest.resolve({
        ...page,
        events: [newEvent],
        nextCursor: null,
        hasMore: false,
      });
      await newProfileRequest.promise;
    });

    expect(JSON.stringify(latest?.sections)).toContain("new-profile-event");
    act(() => tree!.unmount());
    mockActiveProfileId = "viewer-1";
  });
});
