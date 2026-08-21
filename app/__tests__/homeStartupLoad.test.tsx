import React from "react";
import { FlatList, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const mockGetReviews = jest.fn(
  (_options?: Record<string, unknown>) => new Promise(() => undefined)
);
const mockOpenMembership = jest.fn();
const mockRefreshUnseenCount = jest.fn(async () => undefined);
const mockReportError = jest.fn();
let mockProfile: {
  id: string;
  username: string;
  eula_accepted: boolean;
} | null = {
  id: "member-1",
  username: "olive",
  eula_accepted: true,
};
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
    profile: mockProfile,
    updateProfile: jest.fn(),
  }),
}));

jest.mock("@/context/activity-context", () => ({
  useActivity: () => ({
    unseenCount: 0,
    refreshUnseenCount: mockRefreshUnseenCount,
  }),
}));

jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({
    isMember: Boolean(mockProfile),
    requireMembership: jest.fn(() => true),
    openMembership: mockOpenMembership,
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
  reportError: (...args: unknown[]) => mockReportError(...args),
  warn: jest.fn(),
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
jest.mock("@/components/nav/AppHeader", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return function MockAppHeader(props: object) {
    return React.createElement("AppHeader", props);
  };
});
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
    mockOpenMembership.mockClear();
    mockRefreshUnseenCount.mockClear();
    mockReportError.mockClear();
    mockProfile = {
      id: "member-1",
      username: "olive",
      eula_accepted: true,
    };
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

  it("contains a visitor feed outage without a raw error overlay or pagination loop", async () => {
    mockProfile = null;
    mockGetReviews.mockRejectedValue(
      new Error("Edge Function returned a non-2xx status code")
    );

    await act(async () => {
      renderer = create(<Home />);
    });

    expect(mockReportError).not.toHaveBeenCalled();
    expect(mockGetReviews).toHaveBeenCalledTimes(1);

    await act(async () => {
      renderer!.root.findByType(FlatList).props.onEndReached();
      await Promise.resolve();
    });

    expect(mockGetReviews).toHaveBeenCalledTimes(1);
    const copy = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");
    expect(copy).toContain("We couldn't load the club right now.");
    expect(copy).not.toContain("Edge Function returned");
    expect(copy).not.toContain("sharing your own experiences");
  }, 15_000);

  it("uses a browse-oriented empty state when the public club has no reviews", async () => {
    mockProfile = null;
    mockGetReviews.mockResolvedValue([]);

    await act(async () => {
      renderer = create(<Home />);
    });

    const copy = renderer!.root
      .findAllByType(Text)
      .map((node) => node.props.children)
      .flat(Infinity)
      .join(" ");
    expect(copy).toContain("Nothing from the club yet");
    expect(copy).not.toContain("sharing your own experiences");
    expect(copy).not.toContain("Share Your Review");
  });

  it("shows a Join action for visitors and opens the membership prompt", async () => {
    mockProfile = null;
    mockGetReviews.mockResolvedValue([]);

    await act(async () => {
      renderer = create(<Home />);
    });

    const action = renderer!.root.findByType("AppHeader" as React.ElementType)
      .props.actions[0];

    expect(action.label).toBe("Join");
    expect(action.icon).toBeUndefined();
    expect(action.accessibilityLabel).toBe("Join the club");

    act(() => action.onPress());
    expect(mockOpenMembership).toHaveBeenCalledWith("profile");
  });

  it("shows the Activity center action to signed-in members", async () => {
    mockGetReviews.mockResolvedValue([]);

    await act(async () => {
      renderer = create(<Home />);
    });

    const action = renderer!.root.findByType("AppHeader" as React.ElementType)
      .props.actions[0];

    expect(action.icon).toBe("heart-outline");
    expect(action.accessibilityLabel).toBe("Activity");
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
      accessibilityLabel: "Showing From the Club. Tap to switch feed source.",
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
