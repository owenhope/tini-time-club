import React from "react";
import { FlatList } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const mockGetReviews = jest.fn(
  (_options?: Record<string, unknown>) => new Promise(() => undefined)
);
const mockRefreshUnseenCount = jest.fn(async () => undefined);
let mockReviewUpdateCallback: (() => void) | null = null;

const deferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((promiseResolve) => {
    resolve = promiseResolve;
  });

  return { promise, resolve };
};

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    Link: ({ children }: { children: React.ReactNode }) => children,
    useFocusEffect: (callback: () => void | (() => void)) =>
      React.useEffect(callback, [callback]),
    useLocalSearchParams: () => ({}),
    useRouter: () => ({
      navigate: jest.fn(),
      push: jest.fn(),
      replace: jest.fn(),
    }),
  };
});

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({
    profile: {
      id: "member-1",
      username: "olive",
      eula_accepted: true,
    },
    updateProfile: jest.fn(),
  }),
}));

jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({
    isMember: true,
    requireMembership: jest.fn(() => true),
    openMembership: jest.fn(),
  }),
}));

jest.mock("@/context/activity-context", () => ({
  useActivity: () => ({
    unseenCount: 0,
    refreshUnseenCount: mockRefreshUnseenCount,
  }),
}));

jest.mock("@/services/databaseService", () => ({
  __esModule: true,
  default: {
    getReviews: (options: Record<string, unknown>) => mockGetReviews(options),
  },
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/utils/reviewEvents", () => ({
  subscribeToReviewUpdates: (callback: () => void) => {
    mockReviewUpdateCallback = callback;
    return () => undefined;
  },
}));
jest.mock("@/utils/scrollUtils", () => ({ setGlobalScrollToTop: jest.fn() }));
jest.mock("@/utils/screenshotMode", () => ({
  isScreenshotSeed: () => false,
}));
jest.mock("@/utils/tiniTime", () => ({
  getTiniTimeGreeting: () => ({ headline: "Hello", subline: "Again" }),
}));
jest.mock("@/utils/async", () => ({
  withTimeout: (promise: Promise<unknown>) => promise,
}));
jest.mock("@/utils/log", () => ({
  log: jest.fn(),
  reportError: jest.fn(),
}));

jest.mock("expo-image", () => ({
  Image: { prefetch: jest.fn(async () => undefined) },
}));
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));
jest.mock("bad-words", () => ({
  Filter: class {
    isProfane() {
      return false;
    }
  },
}));
jest.mock("@/components/ReviewItem", () => {
  const React = require("react");

  return function MockReviewItem({ review }: { review: { id: string } }) {
    return React.createElement("ReviewItemMock", { reviewId: review.id });
  };
});
jest.mock("@/components/LikeSlider", () => () => null);
jest.mock("@/components/CommentsSlider", () => () => null);
jest.mock("@/components/nav/AppHeader", () => () => null);
jest.mock("@/components/shared", () => ({
  Button: () => null,
  Input: () => null,
  MartiniIcon: () => null,
}));

jest.mock("@/theme", () => {
  const theme = {
    colors: {
      accent: "#336654",
      background: "#ffffff",
      border: "#eeeeee",
      danger: "#ff0000",
      onAccent: "#ffffff",
      onInk: "#ffffff",
      surface: "#ffffff",
      text: "#000000",
      textMuted: "#666666",
    },
    elevation: { card: {} },
    radius: { card: 12, pill: 999, sheet: 20 },
    spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
  };
  return {
    fonts: {
      bold: "Figtree-Bold",
      regular: "Figtree-Regular",
      semibold: "Figtree-Semibold",
    },
    makeStyles: () => () => new Proxy({}, { get: () => ({}) }),
    useTheme: () => theme,
  };
});

import Home from "@/app/(tabs)/(home)/home";

describe("Feed startup loading", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    mockGetReviews.mockReset();
    mockGetReviews.mockImplementation(() => new Promise(() => undefined));
    mockRefreshUnseenCount.mockClear();
    mockReviewUpdateCallback = null;
  });

  afterEach(() => {
    act(() => renderer?.unmount());
  });

  it("starts only one first-page request when the Feed mounts focused", async () => {
    await act(async () => {
      renderer = create(<Home />);
    });

    expect(mockGetReviews).toHaveBeenCalledTimes(1);
  });

  it("keeps the selected people feed when an older club refresh resolves last", async () => {
    const clubRefresh = deferred<{ id: string; user_id: string }[]>();
    const peopleRefresh = deferred<{ id: string; user_id: string }[]>();

    let clubRequestCount = 0;
    mockGetReviews.mockImplementation((options?: Record<string, unknown>) => {
      if (options?.followedOnly) return peopleRefresh.promise;
      clubRequestCount += 1;
      return clubRequestCount === 1
        ? Promise.resolve([{ id: "initial-club", user_id: "club-member" }])
        : clubRefresh.promise;
    });

    await act(async () => {
      renderer = create(<Home />);
    });

    expect(mockReviewUpdateCallback).not.toBeNull();

    await act(async () => {
      mockReviewUpdateCallback?.();
    });

    const feedToggle = renderer!.root.findByProps({
      accessibilityLabel: "Showing From the club. Tap to switch feed source.",
    });

    await act(async () => {
      feedToggle.props.onPress();
      await Promise.resolve();
    });

    expect(mockGetReviews).toHaveBeenLastCalledWith(
      expect.objectContaining({
        followedOnly: true,
        limit: 20,
        offset: 0,
      })
    );

    await act(async () => {
      peopleRefresh.resolve([
        { id: "people-review", user_id: "followed-member" },
      ]);
      await peopleRefresh.promise;
    });

    expect(
      renderer!.root
        .findByType(FlatList)
        .props.data.map((review: { id: string }) => review.id)
    ).toEqual(["people-review"]);

    await act(async () => {
      clubRefresh.resolve([{ id: "stale-club", user_id: "club-member" }]);
      await clubRefresh.promise;
    });

    expect(
      renderer!.root
        .findByType(FlatList)
        .props.data.map((review: { id: string }) => review.id)
    ).toEqual(["people-review"]);
  });

  it("keeps the newest reviews when a refresh exceeds the cache limit", async () => {
    const reviews = Array.from({ length: 120 }, (_, index) => ({
      id: `review-${index}`,
      user_id: "club-member",
    }));
    mockGetReviews.mockResolvedValueOnce(reviews);

    await act(async () => {
      renderer = create(<Home />);
    });

    const cachedReviewIds = renderer!.root
      .findByType(FlatList)
      .props.data.map((review: { id: string }) => review.id);

    expect(cachedReviewIds).toHaveLength(100);
    expect(cachedReviewIds[0]).toBe("review-0");
    expect(cachedReviewIds[99]).toBe("review-99");
    expect(cachedReviewIds).not.toContain("review-100");
  });
});
