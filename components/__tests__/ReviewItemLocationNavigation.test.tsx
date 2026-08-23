import React from "react";
import renderer, { act, type ReactTestRenderer } from "react-test-renderer";

import ReviewItem from "@/components/ReviewItem";
import type { Review } from "@/types/types";

const mockPush = jest.fn();
const mockOpenProfile = jest.fn();

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  const ReactActual = jest.requireActual<typeof import("react")>("react");

  return new Proxy(actual, {
    get(target, prop) {
      if (prop === "TouchableOpacity") {
        return (props: { children?: React.ReactNode }) =>
          ReactActual.createElement("TouchableOpacity", props, props.children);
      }
      return target[prop];
    },
  });
});

jest.mock("expo-router", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");

  return {
    useRouter: () => ({ push: mockPush }),
    Link: ({
      children,
      href,
      onPress,
    }: {
      children: React.ReactElement;
      href: string;
      onPress?: (event: { preventDefault: () => void }) => void;
    }) => ReactActual.createElement("ExpoLink", { href, onPress }, children),
  };
});

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: { id: "member-1", username: "olive" } }),
}));

jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({ requireMembership: jest.fn(() => true) }),
}));

jest.mock("@/hooks/useAppNavigation", () => ({
  useOpenProfile: () => mockOpenProfile,
}));

jest.mock("@/hooks/useReviewShareMenu", () => ({
  useReviewShareMenu: () => jest.fn(),
}));

jest.mock("@/utils/supabase", () => ({ supabase: { from: jest.fn() } }));
jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));
jest.mock("@/services/databaseService", () => ({
  __esModule: true,
  default: {},
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
}));
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
}));

jest.mock("@/components/shared", () => ({
  Avatar: () => null,
  RatingPips: () => null,
  PIPS_MAX: 5,
  VerifiedName: () => null,
}));
jest.mock("@/components/shared/review-tag", () => () => null);
jest.mock("@/components/ReportModal", () => () => null);
jest.mock("@/components/ActionSheet", () => () => null);
jest.mock("@/components/ReviewImageViewer", () => () => null);

jest.mock("@/theme", () => ({
  HIT_SLOP: { top: 8, right: 8, bottom: 8, left: 8 },
  makeStyles: () => () => new Proxy({}, { get: () => ({}) }),
  useTheme: () => ({
    colors: new Proxy({}, { get: () => "#000000" }),
  }),
}));

const review = {
  id: "review-1",
  user_id: "member-1",
  image_url: "https://example.com/review.jpg",
  comment: "A proper martini.",
  taste: 4,
  presentation: 4,
  likes_count: 0,
  comments_count: 0,
  inserted_at: "2026-08-23T12:00:00.000Z",
  location: {
    id: "place-1",
    name: "The Olive Room",
    address: "Vancouver, Canada",
    rating: null,
    total_ratings: 0,
  },
  profile: { id: "member-1", username: "olive" },
} as Review;

describe("ReviewItem location navigation", () => {
  it("queues its place route without navigating immediately", () => {
    let queuedNavigation: (() => void) | undefined;
    const onNavigate = jest.fn((navigate: () => void) => {
      queuedNavigation = navigate;
    });
    let tree!: ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ReviewItem
          review={review}
          canDelete={false}
          onShowLikes={jest.fn()}
          onShowComments={jest.fn()}
          onCommentAdded={jest.fn()}
          onCommentDeleted={jest.fn()}
          onNavigate={onNavigate}
        />
      );
    });

    expect(
      tree.root.findAllByType("ExpoLink" as React.ElementType)
    ).toHaveLength(0);

    const venueButton = tree.root
      .findAllByType("TouchableOpacity" as React.ElementType)
      .find((node) => node.props.accessibilityLabel === "The Olive Room");
    expect(venueButton).toBeDefined();
    expect(venueButton?.props.onPress).toEqual(expect.any(Function));

    act(() => venueButton?.props.onPress());

    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();

    act(() => queuedNavigation?.());

    expect(mockPush).toHaveBeenCalledWith("/places/place-1");
  });
});
