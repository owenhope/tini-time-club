import React from "react";
import { Modal } from "react-native";
import renderer, { act, type ReactTestRenderer } from "react-test-renderer";

import ReviewGrid from "@/components/ReviewGrid";
import type { Review } from "@/types/types";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("expo-image", () => ({ Image: () => null }));

jest.mock("react-native-gesture-handler", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { View } = jest.requireActual("react-native");

  return {
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
      ReactActual.createElement(View, null, children),
  };
});

jest.mock("@/components/ReviewItem", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { Pressable: PressableActual, Text } =
    jest.requireActual("react-native");

  return function MockReviewItem({
    onNavigate,
    onShowComments,
    onShowLikes,
  }: {
    onNavigate?: (navigate: () => void) => void;
    onShowComments?: () => void;
    onShowLikes?: () => void;
  }) {
    return ReactActual.createElement(
      ReactActual.Fragment,
      null,
      ReactActual.createElement(
        PressableActual,
        {
          testID: "expanded-review-location",
          onPress: () => {
            const event = {
              defaultPrevented: false,
              preventDefault() {
                this.defaultPrevented = true;
              },
            };
            const navigate = () => mockPush("/places/place-1");
            if (onNavigate) {
              event.preventDefault();
              onNavigate(navigate);
            }
            if (!event.defaultPrevented) navigate();
          },
        },
        ReactActual.createElement(Text, null, "Open place")
      ),
      ReactActual.createElement(
        PressableActual,
        {
          testID: "expanded-review-username",
          onPress: () => {
            const navigate = () => mockPush("/users/olive");
            if (onNavigate) onNavigate(navigate);
            else navigate();
          },
        },
        ReactActual.createElement(Text, null, "Open profile")
      ),
      ReactActual.createElement(
        PressableActual,
        { testID: "expanded-review-comments", onPress: onShowComments },
        ReactActual.createElement(Text, null, "Open comments")
      ),
      ReactActual.createElement(
        PressableActual,
        { testID: "expanded-review-likes", onPress: onShowLikes },
        ReactActual.createElement(Text, null, "Open likes")
      )
    );
  };
});

jest.mock("@/components/CommentsSlider", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { Pressable: PressableActual, Text } =
    jest.requireActual("react-native");

  return function MockCommentsSlider({
    onNavigate,
  }: {
    onNavigate?: (navigate: () => void) => void;
  }) {
    return ReactActual.createElement(
      PressableActual,
      {
        testID: "comment-author",
        onPress: () => onNavigate?.(() => mockPush("/users/comment-author")),
      },
      ReactActual.createElement(Text, null, "Comment author")
    );
  };
});

jest.mock("@/components/LikeSlider", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { Pressable: PressableActual, Text } =
    jest.requireActual("react-native");

  return function MockLikeSlider({
    onNavigate,
  }: {
    onNavigate?: (navigate: () => void) => void;
  }) {
    return ReactActual.createElement(
      PressableActual,
      {
        testID: "like-profile",
        onPress: () => onNavigate?.(() => mockPush("/users/like-profile")),
      },
      ReactActual.createElement(Text, null, "Like profile")
    );
  };
});
jest.mock("@/components/nav/AppHeader", () => () => null);
jest.mock("@/components/shared", () => ({
  RatingPips: () => null,
  Skeleton: () => null,
}));

jest.mock("@/theme", () => ({
  makeStyles: () => () => new Proxy({}, { get: () => ({}) }),
  useTheme: () => ({ colors: { accent: "#336654" } }),
}));

const review = {
  id: "review-1",
  user_id: "member-1",
  image_url: "https://example.com/review.jpg",
  comment: "A proper martini.",
  taste: 4,
  presentation: 4,
  inserted_at: "2026-08-23T12:00:00.000Z",
  location: {
    id: "place-1",
    name: "The Olive Room",
    address: "Vancouver, Canada",
  },
  profile: { id: "member-1", username: "olive" },
} as Review;

describe("ReviewGrid expanded review navigation", () => {
  beforeEach(() => {
    mockPush.mockClear();
  });

  it("dismisses the review sheet when its location is opened", () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ReviewGrid reviews={[review]} />);
    });

    act(() => {
      tree.root
        .findByProps({ accessibilityHint: "Opens the full review" })
        .props.onPress();
    });

    expect(tree.root.findByType(Modal).props.visible).toBe(true);

    const locationButton = tree.root.findByProps({
      testID: "expanded-review-location",
    });
    expect(locationButton.props.onPress).toEqual(expect.any(Function));

    act(() => locationButton.props.onPress());

    expect(tree.root.findByType(Modal).props.visible).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();

    act(() => tree.root.findByType(Modal).props.onDismiss());

    expect(mockPush).toHaveBeenCalledWith("/places/place-1");
  });

  it("dismisses the review sheet when its author's username is opened", () => {
    let tree!: ReactTestRenderer;
    act(() => {
      tree = renderer.create(<ReviewGrid reviews={[review]} />);
    });

    act(() => {
      tree.root
        .findByProps({ accessibilityHint: "Opens the full review" })
        .props.onPress();
    });

    expect(tree.root.findByType(Modal).props.visible).toBe(true);

    const usernameButton = tree.root.findByProps({
      testID: "expanded-review-username",
    });
    expect(usernameButton.props.onPress).toEqual(expect.any(Function));

    act(() => usernameButton.props.onPress());

    expect(tree.root.findByType(Modal).props.visible).toBe(false);
    expect(mockPush).not.toHaveBeenCalled();

    act(() => tree.root.findByType(Modal).props.onDismiss());

    expect(mockPush).toHaveBeenCalledWith("/users/olive");
  });

  it.each([
    ["comments", "comment-author", "/users/comment-author"],
    ["likes", "like-profile", "/users/like-profile"],
  ])(
    "dismisses the review sheet before navigating from its %s sheet",
    (nestedSheet, profileButton, expectedRoute) => {
      let tree!: ReactTestRenderer;
      act(() => {
        tree = renderer.create(<ReviewGrid reviews={[review]} />);
      });

      act(() => {
        tree.root
          .findByProps({ accessibilityHint: "Opens the full review" })
          .props.onPress();
      });

      act(() => {
        tree.root
          .findByProps({ testID: `expanded-review-${nestedSheet}` })
          .props.onPress();
      });

      act(() => {
        tree.root.findByProps({ testID: profileButton }).props.onPress();
      });

      expect(tree.root.findByType(Modal).props.visible).toBe(false);
      expect(mockPush).not.toHaveBeenCalled();

      act(() => tree.root.findByType(Modal).props.onDismiss());

      expect(mockPush).toHaveBeenCalledWith(expectedRoute);
    }
  );
});
