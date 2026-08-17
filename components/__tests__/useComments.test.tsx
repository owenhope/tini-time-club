/**
 * Pins the comment-patch idempotency fix in ReviewItem's useComments hook:
 * the parent's `_commentPatch` is re-applied whenever a recycled row
 * remounts, so applying the same "add" patch more than once must not
 * duplicate the comment.
 */
import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text } from "react-native";
import ReviewItem from "../ReviewItem";
import databaseService from "@/services/databaseService";
import { ThemeProvider, typography } from "@/theme";

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

// Chainable stub: the overlay looks up a venue's aggregate rating when the
// feed row didn't carry one, so `from()` has to survive .select().eq()…
jest.mock("@/utils/supabase", () => {
  const chain: Record<string, jest.Mock> = {};
  for (const method of ["select", "eq", "upsert", "delete", "insert"]) {
    chain[method] = jest.fn(() => chain);
  }
  chain.maybeSingle = jest.fn(() =>
    Promise.resolve({ data: null, error: null })
  );
  chain.single = chain.maybeSingle;
  return {
    supabase: { from: jest.fn(() => chain) },
    supabaseProjectRef: "testref",
  };
});

jest.mock("@/utils/log", () => ({
  log: jest.fn(),
  reportError: jest.fn(),
}));

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: { id: "viewer-1" } }),
}));

jest.mock("@/services/databaseService", () => ({
  __esModule: true,
  default: { getComments: jest.fn(), setCommentLiked: jest.fn() },
}));

jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

jest.mock("expo-image", () => ({
  Image: () => null,
}));

jest.mock("expo-router", () => ({
  Link: ({ children }: any) => children,
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium" },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
}));

jest.mock("@/components/shared", () => {
  const ReactActual = require("react");
  const { Text: RNText } = require("react-native");
  return {
    Avatar: () => null,
    Badge: () => null,
    RatingPips: () => null,
    PIPS_MAX: 5,
    RatingSummary: () => null,
    VerifiedName: ({ name }: any) =>
      ReactActual.createElement(RNText, null, name),
  };
});

jest.mock("@/components/ReportModal", () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock("@/components/ActionSheet", () => ({
  __esModule: true,
  default: () => null,
}));

const getComments = databaseService.getComments as jest.Mock;
const setCommentLiked = databaseService.setCommentLiked as jest.Mock;

const COMMENT_BODY = "Great martini!";
const comment = {
  id: 1,
  body: COMMENT_BODY,
  profile: { username: "alice", is_verified: false },
};

const makeReview = (overrides: Record<string, any> = {}): any => ({
  id: "review-1",
  image_url: "https://example.com/martini.jpg",
  comment: "",
  taste: 4,
  presentation: 4,
  inserted_at: new Date().toISOString(),
  profile: { id: "author-1", username: "bob", is_verified: false },
  location: { id: 7, name: "The Velvet Olive", address: "1 Main St" },
  spirit: { name: "gin" },
  type: { name: "classic" },
  likes_count: 0,
  has_liked: false,
  comments_count: 0,
  recent_comments: [],
  ...overrides,
});

const noop = () => {};

const renderReview = (review: any) => {
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ThemeProvider>
        <ReviewItem
          review={review}
          canDelete={false}
          onShowLikes={noop}
          onShowComments={noop}
          onCommentAdded={noop}
          onCommentDeleted={noop}
        />
      </ThemeProvider>
    );
  });
  return tree!;
};

const updateReview = (tree: renderer.ReactTestRenderer, review: any) => {
  act(() => {
    tree.update(
      <ThemeProvider>
        <ReviewItem
          review={review}
          canDelete={false}
          onShowLikes={noop}
          onShowComments={noop}
          onCommentAdded={noop}
          onCommentDeleted={noop}
        />
      </ThemeProvider>
    );
  });
};

/** Presses the footer's comment button, which lazily loads the comments. */
const openComments = async (tree: renderer.ReactTestRenderer) => {
  const icon = tree.root.findAll((n) =>
    /comments?$/.test(String(n.props?.accessibilityLabel ?? ""))
  )[0];
  expect(icon).toBeDefined();

  let node: any = icon.parent;
  while (node && typeof node.props?.onPress !== "function") {
    node = node.parent;
  }
  expect(node).toBeDefined();

  await act(async () => {
    node.props.onPress();
  });
};

const countOccurrences = (
  tree: renderer.ReactTestRenderer,
  needle: string
): number =>
  tree.root
    .findAllByType(Text)
    .map((node) =>
      node.props.children == null
        ? ""
        : String(
            Array.isArray(node.props.children)
              ? node.props.children.join("")
              : node.props.children
          )
    )
    .join(" ")
    .split(needle).length - 1;

beforeEach(() => {
  jest.clearAllMocks();
  getComments.mockResolvedValue([comment]);
  setCommentLiked.mockResolvedValue(undefined);
});

describe("ReviewItem comment patches (useComments idempotency)", () => {
  it("shows a patched comment exactly once after the row remounts with the same review object", async () => {
    const review = makeReview({
      comments_count: 1,
      _commentPatch: { action: "add", data: comment },
    });

    let tree = renderReview(review);
    await openComments(tree);
    expect(countOccurrences(tree, COMMENT_BODY)).toBe(1);

    // Recycled rows unmount and remount with the SAME review object, which
    // re-applies the patch to a fresh hook instance.
    act(() => tree.unmount());
    tree = renderReview(review);
    await openComments(tree);

    expect(countOccurrences(tree, COMMENT_BODY)).toBe(1);
    act(() => tree.unmount());
  }, 15_000);

  it("does not duplicate a comment when the patch re-arrives after the list has loaded", async () => {
    const review = makeReview({ comments_count: 1 });
    const tree = renderReview(review);

    // Load the full comment list first, so the incoming patch targets a
    // comment that is already in state — the exact duplicate scenario.
    await openComments(tree);
    expect(countOccurrences(tree, COMMENT_BODY)).toBe(1);

    updateReview(
      tree,
      makeReview({
        comments_count: 1,
        _commentPatch: { action: "add", data: { ...comment } },
      })
    );

    expect(countOccurrences(tree, COMMENT_BODY)).toBe(1);
    act(() => tree.unmount());
  });

  it("applies a delete patch by removing the comment", async () => {
    const review = makeReview({ comments_count: 1 });
    const tree = renderReview(review);
    await openComments(tree);
    expect(countOccurrences(tree, COMMENT_BODY)).toBe(1);

    updateReview(
      tree,
      makeReview({
        comments_count: 1,
        _commentPatch: { action: "delete", id: comment.id },
      })
    );

    expect(countOccurrences(tree, COMMENT_BODY)).toBe(0);
    act(() => tree.unmount());
  });

  it("adds a genuinely new comment from a patch", async () => {
    const review = makeReview({ comments_count: 1 });
    const tree = renderReview(review);
    await openComments(tree);

    const another = {
      id: 2,
      body: "Perfectly chilled.",
      profile: { username: "carol", is_verified: false },
    };
    updateReview(
      tree,
      makeReview({
        comments_count: 2,
        _commentPatch: { action: "add", data: another },
      })
    );

    expect(countOccurrences(tree, COMMENT_BODY)).toBe(1);
    expect(countOccurrences(tree, "Perfectly chilled.")).toBe(1);
    act(() => tree.unmount());
  });

  it("likes a visible feed comment without opening the drawer", async () => {
    const review = makeReview({
      comments_count: 1,
      recent_comments: [
        {
          ...comment,
          inserted_at: new Date().toISOString(),
          user_id: "comment-author",
          likes_count: 0,
          has_liked: false,
        },
      ],
    });
    const tree = renderReview(review);
    const likeButton = tree.root.findByProps({
      accessibilityLabel: "Like comment by alice",
    });

    await act(async () => {
      await likeButton.props.onPress();
    });

    expect(setCommentLiked).toHaveBeenCalledWith(
      comment.id,
      "viewer-1",
      true,
      review.id
    );
    expect(
      tree.root.findByProps({
        accessibilityLabel: "Unlike comment by alice",
      }).props.accessibilityState
    ).toEqual({ selected: true });
    const likedButton = tree.root.findByProps({
      accessibilityLabel: "Unlike comment by alice",
    });
    expect(StyleSheet.flatten(likedButton.props.style)).toEqual(
      expect.objectContaining({ flexDirection: "column" })
    );
    expect(
      StyleSheet.flatten(likedButton.props.children[1].props.style)
    ).toEqual(expect.objectContaining(typography.label));
    expect(getComments).not.toHaveBeenCalled();
    act(() => tree.unmount());
  });

  it("shows one feed comment preview before the more comments link", () => {
    const review = makeReview({
      comments_count: 3,
      recent_comments: [
        {
          ...comment,
          id: 10,
          body: "First visible preview.",
          inserted_at: new Date().toISOString(),
          user_id: "comment-author-1",
          likes_count: 0,
          has_liked: false,
        },
        {
          ...comment,
          id: 11,
          body: "Second hidden preview.",
          inserted_at: new Date().toISOString(),
          user_id: "comment-author-2",
          likes_count: 0,
          has_liked: false,
        },
      ],
    });
    const tree = renderReview(review);

    expect(countOccurrences(tree, "First visible preview.")).toBe(1);
    expect(countOccurrences(tree, "Second hidden preview.")).toBe(0);
    expect(countOccurrences(tree, "view more comments")).toBe(1);
    expect(countOccurrences(tree, "more comments")).toBe(1);
    expect(countOccurrences(tree, "View all 3 comments")).toBe(0);

    act(() => tree.unmount());
  });
});
