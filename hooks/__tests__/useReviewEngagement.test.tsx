import React from "react";
import renderer, { act } from "react-test-renderer";
import { useReviewEngagement } from "../useReviewEngagement";

const mockUpsert = jest.fn();
jest.mock("@/utils/supabase", () => ({
  supabase: {
    from: () => ({ upsert: (...args: unknown[]) => mockUpsert(...args) }),
  },
}));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
}));
jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({ requireMembership: () => true }),
}));
jest.mock("@/hooks/useReviewShareMenu", () => ({
  useReviewShareMenu: () => jest.fn(),
}));
jest.mock("@/services/databaseService", () => ({
  __esModule: true,
  default: {},
}));
jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));

const review = {
  id: "42",
  user_id: "author-1",
  likes_count: 3,
  has_liked: false,
  comments_count: 0,
  recent_comments: [],
} as never;

const result: { current?: ReturnType<typeof useReviewEngagement> } = {};
function Probe({ onLikeChanged }: { onLikeChanged: jest.Mock }) {
  const data = useReviewEngagement({
    review,
    profile: { id: "viewer-1" } as never,
    onShowLikes: jest.fn(),
    onLikeChanged,
  });
  React.useEffect(() => {
    result.current = data;
  });
  return null;
}

it("reports a confirmed like so the list can keep it", async () => {
  mockUpsert.mockResolvedValue({ error: null });
  const onLikeChanged = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Probe onLikeChanged={onLikeChanged} />);
  });

  await act(async () => {
    await result.current!.handleToggleLike();
  });

  expect(onLikeChanged).toHaveBeenCalledWith("42", true, 4);
  act(() => tree.unmount());
});

it("does not report a like that failed to save", async () => {
  mockUpsert.mockResolvedValue({ error: new Error("offline") });
  const onLikeChanged = jest.fn();
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Probe onLikeChanged={onLikeChanged} />);
  });

  await act(async () => {
    await result.current!.handleToggleLike();
  });

  expect(onLikeChanged).not.toHaveBeenCalled();
  expect(result.current!.hasLiked).toBe(false);
  expect(result.current!.likesCount).toBe(3);
  act(() => tree.unmount());
});
