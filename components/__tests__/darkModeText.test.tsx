import React from "react";
import renderer, { act } from "react-test-renderer";
import { StyleSheet, Text } from "react-native";
import ReviewItem from "../ReviewItem";
import { ThemeProvider, darkColors, lightColors, typography } from "@/theme";

const mockReact = React;
const MockText = Text;
let mockColorScheme: "light" | "dark" = "dark";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop) {
      if (prop === "useColorScheme") {
        return jest.fn(() => mockColorScheme);
      }
      return target[prop];
    },
  });
});

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

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
  default: { getComments: jest.fn() },
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
  ImpactFeedbackStyle: { Medium: "medium" },
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
  MaterialIcons: () => null,
}));

jest.mock("@/components/shared", () => {
  return {
    Avatar: () => null,
    Badge: () => null,
    RatingPips: () => null,
    PIPS_MAX: 5,
    RatingSummary: () => null,
    VerifiedName: ({ name, textStyle }: any) =>
      mockReact.createElement(MockText, { style: textStyle }, name),
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

const makeReview = (overrides: Record<string, any> = {}): any => ({
  id: "review-1",
  image_url: "https://example.com/martini.jpg",
  comment: "Dark mode caption",
  taste: 4,
  presentation: 4,
  inserted_at: new Date().toISOString(),
  profile: { id: "author-1", username: "bob", is_verified: false },
  location: { id: 7, name: "The Velvet Olive", address: "1 Main St" },
  spirit: { name: "gin" },
  type: { name: "classic" },
  likes_count: 0,
  has_liked: false,
  comments_count: 1,
  recent_comments: [
    {
      id: 1,
      body: "Dark mode comment",
      profile: { username: "alice", is_verified: false },
    },
  ],
  ...overrides,
});

const renderReview = (review: any, colorScheme: "light" | "dark" = "dark") => {
  mockColorScheme = colorScheme;
  let tree: renderer.ReactTestRenderer;
  act(() => {
    tree = renderer.create(
      <ThemeProvider>
        <ReviewItem
          review={review}
          canDelete={false}
          onShowLikes={jest.fn()}
          onShowComments={jest.fn()}
          onCommentAdded={jest.fn()}
          onCommentDeleted={jest.fn()}
        />
      </ThemeProvider>
    );
  });
  return tree!;
};

const ownColor = (node: renderer.ReactTestInstance) =>
  StyleSheet.flatten(node.props.style)?.color;

const inheritedColor = (node: renderer.ReactTestInstance) => {
  let current: renderer.ReactTestInstance | null = node;
  while (current) {
    const color = ownColor(current);
    if (color) return color;
    current = current.parent;
  }
};

describe("dark mode post text", () => {
  it("uses themed text for captions, inline comment previews, and the score", () => {
    const tree = renderReview(makeReview());

    const authorUsername = tree.root
      .findAllByType(Text)
      .find((node) => node.props.children === "bob");
    const reviewCount = tree.root
      .findAllByType(Text)
      .find((node) => node.props.children === "0 reviews");
    const captionText = tree.root
      .findAllByType(Text)
      .find((node) =>
        String(node.props.children).includes("Dark mode caption")
      );
    const commentText = tree.root
      .findAllByType(Text)
      .find((node) =>
        String(node.props.children).includes("Dark mode comment")
      );
    const overallScore = tree.root
      .findAllByType(Text)
      .find((node) => node.props.children === "4.0");

    expect(inheritedColor(authorUsername!)).toBe(darkColors.postText);
    expect(StyleSheet.flatten(authorUsername!.props.style)).toMatchObject(
      typography.bodyStrong
    );
    expect(StyleSheet.flatten(reviewCount!.props.style)).toMatchObject(
      typography.label
    );
    expect(inheritedColor(captionText!)).toBe(darkColors.postText);
    expect(inheritedColor(commentText!)).toBe(darkColors.postText);
    expect(inheritedColor(overallScore!)).toBe(darkColors.textSecondary);

    act(() => tree.unmount());
  });

  it("uses near-black ink for usernames, captions, and comments in light mode", () => {
    const tree = renderReview(makeReview(), "light");
    const authorUsername = tree.root
      .findAllByType(Text)
      .find((node) => node.props.children === "bob");
    const captionText = tree.root
      .findAllByType(Text)
      .find((node) =>
        String(node.props.children).includes("Dark mode caption")
      );
    const commentText = tree.root
      .findAllByType(Text)
      .find((node) =>
        String(node.props.children).includes("Dark mode comment")
      );

    expect(inheritedColor(authorUsername!)).toBe(lightColors.postText);
    expect(inheritedColor(captionText!)).toBe(lightColors.postText);
    expect(inheritedColor(commentText!)).toBe(lightColors.postText);

    act(() => tree.unmount());
  });

  it("sizes the photo from the card instead of the screen", () => {
    const tree = renderReview(makeReview());
    const photo = tree.root.findByProps({ testID: "review-photo" });
    const style = StyleSheet.flatten(photo.props.style);

    expect(style.width).toBe("100%");
    expect(style.aspectRatio).toBe(16 / 11);
    expect(style.height).toBeUndefined();

    act(() => tree.unmount());
  });
});
