import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import TabsLayout from "@/app/(tabs)/_layout";

const mockGlobalScrollToTop = jest.fn();
let mockPathname = "/home";

jest.mock("expo-router", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

jest.mock("expo-router/unstable-native-tabs", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const NativeTabs = ({ children }: { children: React.ReactNode }) =>
    React.createElement("NativeTabs", null, children);
  const Trigger = ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    name: string;
  }) => React.createElement("NativeTabTrigger", props, children);
  const TriggerIcon = (props: object) =>
    React.createElement("NativeTabIcon", props);
  const TriggerLabel = ({ children }: { children: React.ReactNode }) =>
    React.createElement("NativeTabLabel", null, children);
  const TriggerVectorIcon = (props: object) =>
    React.createElement("NativeTabVectorIcon", props);
  Trigger.Icon = TriggerIcon;
  Trigger.Label = TriggerLabel;
  Trigger.VectorIcon = TriggerVectorIcon;
  NativeTabs.Trigger = Trigger;
  return { NativeTabs };
});

const memberProfile = {
  id: "member-1",
  username: "olive",
  eula_accepted: true,
  weekly_push_notifications_enabled: true,
};
let mockProfile: typeof memberProfile | null = memberProfile;

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({
    loading: false,
    profile: mockProfile,
  }),
}));

const mockRequireMembership = jest.fn(() => true);

jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({
    isMember: Boolean(mockProfile),
    requireMembership: mockRequireMembership,
    openMembership: jest.fn(),
  }),
}));

jest.mock("@/theme", () => ({
  fonts: { medium: "medium", semibold: "semibold" },
  typography: {
    label: { fontFamily: "bold", fontSize: 12, lineHeight: 16 },
  },
  useTheme: () => ({
    colors: {
      accent: "purple",
      background: "white",
      divider: "gray",
      secondary: "green",
      tabBar: "white",
      tabBarInactive: "gray",
    },
  }),
}));

jest.mock("expo-notifications", () => ({
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  setNotificationHandler: jest.fn(),
}));

jest.mock("@/services/pushNotificationService", () => ({
  arePushNotificationsEnabled: () => false,
  getNotificationRoute: () => null,
  registerPushNotificationsAsync: jest.fn(async () => undefined),
  subscribeToPushRegistrationRetry: () => ({ remove: jest.fn() }),
  subscribeToPushTokenChanges: () => ({ remove: jest.fn() }),
  unregisterPushNotificationsAsync: jest.fn(async () => undefined),
}));
jest.mock("@/utils/martiniReminder", () => ({
  syncFridayMartiniReminder: jest.fn(async () => undefined),
}));
jest.mock("@/utils/notificationOpens", () => ({
  logNotificationOpen: jest.fn(),
}));
jest.mock("@/utils/scrollUtils", () => ({
  getGlobalScrollToTop: () => mockGlobalScrollToTop,
}));
jest.mock("@expo/vector-icons/Ionicons", () => () => null);

describe("native tab icon configuration", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    mockGlobalScrollToTop.mockClear();
    mockRequireMembership.mockClear();
    mockPathname = "/home";
    mockProfile = memberProfile;
  });

  afterEach(() => {
    act(() => renderer?.unmount());
    jest.useRealTimers();
  });

  it("does not give the Feed tab independently loading default and selected vector icons", async () => {
    await act(async () => {
      renderer = create(<TabsLayout />);
    });

    const feedTrigger = renderer!.root.findByProps({ name: "(home)" });
    const feedIcon = feedTrigger.findByType(
      "NativeTabIcon" as React.ElementType
    );

    expect(
      feedIcon.props.src &&
        typeof feedIcon.props.src === "object" &&
        "selected" in feedIcon.props.src
    ).toBe(false);
  });

  it("shows Explore and Index in the five-item native navigation", async () => {
    await act(async () => {
      renderer = create(<TabsLayout />);
    });

    const triggers = renderer!.root.findAllByType(
      "NativeTabTrigger" as React.ElementType
    );

    expect(triggers.map((trigger) => trigger.props.name)).toEqual([
      "(home)",
      "(discover)",
      "(review)",
      "(index)",
      "(profile)",
    ]);
    expect(renderer!.root.findByProps({ name: "(discover)" }).props).toEqual(
      expect.objectContaining({ accessibilityLabel: "Explore" })
    );
    expect(renderer!.root.findAllByProps({ name: "(places)" })).toHaveLength(0);
    expect(renderer!.root.findByProps({ name: "(index)" }).props).toEqual(
      expect.objectContaining({ accessibilityLabel: "Index" })
    );
  });

  it("scrolls the Feed to the top when its active tab is pressed", async () => {
    await act(async () => {
      renderer = create(<TabsLayout />);
    });

    const feedTrigger = renderer!.root.findByProps({ name: "(home)" });

    act(() => {
      feedTrigger.props.listeners.tabPress();
    });

    expect(mockGlobalScrollToTop).toHaveBeenCalledTimes(1);
  });

  it("does not request a Feed scroll while navigating from another tab", async () => {
    mockPathname = "/discover";

    await act(async () => {
      renderer = create(<TabsLayout />);
    });

    const feedTrigger = renderer!.root.findByProps({ name: "(home)" });

    act(() => {
      feedTrigger.props.listeners.tabPress();
    });

    expect(mockGlobalScrollToTop).not.toHaveBeenCalled();
  });

  it("lets signed-in members select Profile through native tabs", async () => {
    await act(async () => {
      renderer = create(<TabsLayout />);
    });

    const profileTrigger = renderer!.root.findByProps({ name: "(profile)" });

    expect(profileTrigger.props.disabled).toBe(false);
    expect(profileTrigger.props.listeners).toBeUndefined();
  });

  it("keeps the Review composer inside the native tab navigator for members", async () => {
    await act(async () => {
      renderer = create(<TabsLayout />);
    });

    const reviewTrigger = renderer!.root.findByProps({ name: "(review)" });

    expect(reviewTrigger.props.disabled).toBe(false);
    expect(reviewTrigger.props.listeners).toBeUndefined();
  });

  it("ignores the ghost tap that falls through from Welcome onto gated tabs", async () => {
    // Welcome's full-width CTA sits where the tab bar mounts; the tail of that
    // tap lands on the Review trigger right after this layout appears.
    mockProfile = null;
    jest.useFakeTimers();

    await act(async () => {
      renderer = create(<TabsLayout />);
    });

    const reviewTrigger = renderer!.root.findByProps({ name: "(review)" });

    act(() => {
      reviewTrigger.props.listeners.tabPress();
    });

    expect(mockRequireMembership).not.toHaveBeenCalled();
  });

  it("still opens the membership gate for deliberate visitor tab presses", async () => {
    mockProfile = null;
    jest.useFakeTimers();

    await act(async () => {
      renderer = create(<TabsLayout />);
    });

    act(() => {
      jest.advanceTimersByTime(701);
    });

    const reviewTrigger = renderer!.root.findByProps({ name: "(review)" });
    act(() => {
      reviewTrigger.props.listeners.tabPress();
    });
    expect(mockRequireMembership).toHaveBeenCalledWith("review");

    const profileTrigger = renderer!.root.findByProps({ name: "(profile)" });
    act(() => {
      profileTrigger.props.listeners.tabPress();
    });
    expect(mockRequireMembership).toHaveBeenCalledWith("profile");
  });
});
