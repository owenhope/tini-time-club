import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

const mockGetReviews = jest.fn(() => new Promise(() => undefined));
const mockRefreshUnseenCount = jest.fn(async () => undefined);

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

jest.mock("@/context/activity-context", () => ({
  useActivity: () => ({
    unseenCount: 0,
    refreshUnseenCount: mockRefreshUnseenCount,
  }),
}));

jest.mock("@/services/databaseService", () => ({
  __esModule: true,
  default: {
    getReviews: () => mockGetReviews(),
    getFollowedUserIds: jest.fn(async () => []),
  },
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/utils/reviewEvents", () => ({
  subscribeToReviewUpdates: () => () => undefined,
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
jest.mock("@/components/ReviewItem", () => () => null);
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
    makeStyles: () => () =>
      new Proxy({}, { get: () => ({}) }),
    useTheme: () => theme,
  };
});

import Home from "@/app/(tabs)/(home)/home";

describe("Feed startup loading", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    mockGetReviews.mockClear();
    mockRefreshUnseenCount.mockClear();
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
});
