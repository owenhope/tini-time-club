import React from "react";
import renderer, { act } from "react-test-renderer";
import UserProfile from "@/components/UserProfile";

const mockTargetProfile = {
  id: "member-2",
  username: "stellavale",
  name: "Stella Vale",
  bio: "North Shore martini notes.",
  review_count: 51,
  deleted: false,
};

const mockLoad = jest.fn(async () => undefined);

jest.mock("@/utils/supabase", () => {
  const relation = {
    select: jest.fn(),
    eq: jest.fn(),
    maybeSingle: jest.fn(async () => ({ data: null, error: null })),
    single: jest.fn(async () => ({ data: mockTargetProfile, error: null })),
  };
  relation.select.mockReturnValue(relation);
  relation.eq.mockReturnValue(relation);
  return { supabase: { from: jest.fn(() => relation) } };
});

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ username: "stellavale" }),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: { id: "member-1", username: "olive" } }),
}));

jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({ requireMembership: jest.fn(() => true) }),
}));

jest.mock("@/hooks/useProfileScreenData", () => ({
  useProfileScreenData: () => ({
    userReviews: [],
    setUserReviews: jest.fn(),
    loadingReviews: false,
    refreshingReviews: false,
    loadMoreUserReviews: mockLoad,
    loadUserReviews: mockLoad,
    regularPlaces: [],
    loadingRegulars: false,
    loadRegularPlaces: mockLoad,
    favoriteLocation: null,
    spirits: [],
    types: [],
    followersCount: 7,
    followingCount: 3,
    setFollowersCount: jest.fn(),
    setFollowingCount: jest.fn(),
    loadFollowCounts: mockLoad,
  }),
}));

jest.mock("@/components/ProfileHeader", () => ({
  __esModule: true,
  default: ({ below }: { below?: React.ReactNode }) => {
    const ReactActual = jest.requireActual<typeof import("react")>("react");
    const { View: ViewActual } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return ReactActual.createElement(
      ViewActual,
      { testID: "profile-header" },
      below
    );
  },
}));

jest.mock("@/components/ProfileContentTabs", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { View: ViewActual } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    __esModule: true,
    default: () =>
      ReactActual.createElement(ViewActual, { testID: "profile-content-tabs" }),
  };
});

jest.mock("@/components/profile/ProfileBody", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  return {
    __esModule: true,
    default: ({ header }: { header: React.ReactNode }) =>
      ReactActual.createElement(ReactActual.Fragment, null, header),
  };
});

jest.mock("@/components/profile/AvatarViewer", () => () => null);
jest.mock("@/components/profile/FavoriteTags", () => ({
  __esModule: true,
  default: () => null,
  parseFavoriteIds: () => [],
}));
jest.mock("@/components/profile/FavoriteLocationLink", () => () => null);
jest.mock("@/components/nav/AppHeader", () => () => null);
jest.mock("@/hooks/useCollapsibleHeader", () => ({
  useCollapsibleHeader: () => ({
    isCollapsed: false,
    progress: undefined,
    onScroll: jest.fn(),
  }),
}));
jest.mock("@/hooks/useAppNavigation", () => ({
  useGoBack: () => jest.fn(),
}));
jest.mock("@/services/databaseService", () => ({
  __esModule: true,
  default: {
    clearFollowCaches: jest.fn(),
    blockUser: jest.fn(),
    unblockUser: jest.fn(),
  },
}));
jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));
jest.mock("@/utils/reviewEvents", () => ({
  subscribeToReviewUpdates: () => () => undefined,
}));
jest.mock("@/theme", () => ({
  makeStyles: () => () => ({}),
  useTheme: () => ({ isDark: false, colors: {} }),
}));
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: "light" },
}));

it("renders another member's Reviews and Regulars tabs inside the profile header", async () => {
  let tree: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<UserProfile />);
  });

  const header = tree!.root.findByProps({ testID: "profile-header" });
  expect(
    header.findAllByProps({ testID: "profile-content-tabs" }).length
  ).toBeGreaterThan(0);
});
