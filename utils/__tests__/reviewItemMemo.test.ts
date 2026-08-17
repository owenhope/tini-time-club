import type { Review } from "@/types/types";
import {
  areReviewItemPropsEqual,
  type ReviewItemMemoProps,
} from "@/utils/reviewItemMemo";

const review = (): Review => ({
  id: "review-1",
  user_id: "member-1",
  comment: "Cold and bright.",
  image_url: "https://example.com/review.jpg",
  inserted_at: "2026-08-17T12:00:00.000Z",
  taste: 4.5,
  presentation: 4,
  likes_count: 2,
  comments_count: 1,
  has_liked: false,
  location: {
    id: "location-1",
    name: "The Bar",
    address: "1 Main St, Vancouver, Canada",
    rating: 4.2,
    total_ratings: 10,
  },
  spirit: { id: 1, name: "Gin" },
  type: { id: 2, name: "Dry" },
  profile: {
    id: "member-1",
    username: "olive",
    avatar_url: "avatars/member-1.jpg",
    is_verified: false,
    review_count: 7,
  },
  recent_comments: [
    {
      id: 3,
      body: "Looks great",
      inserted_at: "2026-08-17T12:01:00.000Z",
      profile: {
        id: "member-2",
        username: "morgan",
        avatar_url: null,
      },
    },
  ],
});

const handlers = {
  onDelete: jest.fn(),
  onEdit: jest.fn(),
  onShowLikes: jest.fn(),
  onShowComments: jest.fn(),
  onCommentAdded: jest.fn(),
  onCommentDeleted: jest.fn(),
};

const props = (): ReviewItemMemoProps => ({
  review: review(),
  canDelete: true,
  ...handlers,
});

describe("ReviewItem memo comparison", () => {
  it("keeps equivalent rendered data memoized", () => {
    expect(areReviewItemPropsEqual(props(), props())).toBe(true);
  });

  it.each([
    ["timestamp", (next: Review) => (next.inserted_at = "2026-08-18")],
    ["username", (next: Review) => (next.profile.username = "new-name")],
    ["avatar", (next: Review) => (next.profile.avatar_url = "new.jpg")],
    ["venue", (next: Review) => (next.location.name = "New Bar")],
    ["spirit", (next: Review) => (next.spirit.name = "Vodka")],
    ["type", (next: Review) => (next.type.name = "Dirty")],
    [
      "comment preview",
      (next: Review) => {
        next.recent_comments![0].body = "Updated comment";
      },
    ],
  ])("re-renders when the %s changes", (_label, mutate) => {
    const previous = props();
    const next = props();
    mutate(next.review);

    expect(areReviewItemPropsEqual(previous, next)).toBe(false);
  });

  it("re-renders when an interaction callback changes", () => {
    const previous = props();
    const next = { ...props(), onEdit: jest.fn() };

    expect(areReviewItemPropsEqual(previous, next)).toBe(false);
  });
});
