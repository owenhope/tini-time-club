import React from "react";
import renderer, { act } from "react-test-renderer";
import { useProfileScreenData } from "../useProfileScreenData";

jest.mock("@/utils/supabase", () => ({
  supabase: { from: jest.fn(), rpc: jest.fn() },
}));
jest.mock("@/services/databaseService", () => ({
  __esModule: true,
  default: {
    getSpirits: jest.fn(async () => []),
    getTypes: jest.fn(async () => []),
  },
}));
jest.mock("@/services/regularsService", () => ({
  getProfileRegularPlaces: jest.fn(async () => []),
}));
jest.mock("@/services/reviewFeedService", () => ({
  getReviewPage: jest.fn(async () => ({ reviews: [], nextCursor: null })),
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));

type Options = Parameters<typeof useProfileScreenData>[0];
const result: { current?: ReturnType<typeof useProfileScreenData> } = {};
function Probe(props: Options) {
  const data = useProfileScreenData(props);
  React.useEffect(() => {
    result.current = data;
  });
  return null;
}

it("keeps a visitor's public follow counts when the visited profile loads", async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <Probe profileId={undefined} viewerId={undefined} />
    );
  });

  // The profile and its public counts arrive together, as for a visitor.
  await act(async () => {
    tree.update(
      <Probe
        profileId="member-2"
        viewerId={undefined}
        knownFollowCounts={{ followers: 12, following: 7 }}
      />
    );
  });

  expect(result.current!.followersCount).toBe(12);
  expect(result.current!.followingCount).toBe(7);
  act(() => tree.unmount());
});

it("still resets follow counts when switching profiles without known counts", async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Probe profileId="member-1" viewerId={undefined} />);
  });
  act(() => result.current!.setFollowersCount(5));
  await act(async () => {
    tree.update(<Probe profileId="member-2" viewerId={undefined} />);
  });

  expect(result.current!.followersCount).toBe(0);
  act(() => tree.unmount());
});

it("lets a refresh cancel an in-flight page without stalling paging", async () => {
  const { getReviewPage } = jest.requireMock("@/services/reviewFeedService");
  const cursor = { createdAt: "2026-10-01T00:00:00Z", id: 1 };
  const firstPage = { reviews: [{ id: 1 }], nextCursor: cursor, hasMore: true };
  let releaseStalePage!: (value: unknown) => void;
  getReviewPage
    .mockResolvedValueOnce(firstPage)
    .mockReturnValueOnce(new Promise((resolve) => (releaseStalePage = resolve)))
    .mockResolvedValueOnce(firstPage)
    .mockResolvedValueOnce({
      reviews: [{ id: 2 }],
      nextCursor: null,
      hasMore: false,
    });

  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Probe profileId="member-1" viewerId="viewer-1" />);
  });
  await act(async () => result.current!.loadUserReviews());
  await act(async () => {
    void result.current!.loadMoreUserReviews();
  });
  await act(async () => result.current!.loadUserReviews(true));
  await act(async () => {
    releaseStalePage({
      reviews: [{ id: 99 }],
      nextCursor: null,
      hasMore: false,
    });
  });

  expect(result.current!.userReviews.map((r) => r.id)).toEqual([1]);
  expect(result.current!.refreshingReviews).toBe(false);

  await act(async () => result.current!.loadMoreUserReviews());
  expect(result.current!.userReviews.map((r) => r.id)).toEqual([1, 2]);
  act(() => tree.unmount());
});
