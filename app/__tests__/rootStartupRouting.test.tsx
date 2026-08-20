import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { AppState, Text, TouchableOpacity } from "react-native";
import { ErrorBoundary, RootLayoutNav } from "../_layout";
import Settings from "../(tabs)/(profile)/settings";

let mockAuthStateChange:
  | ((event: string, session: { user: { id: string } } | null) => Promise<void>)
  | undefined;
let mockProfileState: {
  profile: {
    id: string;
    username: string | null;
    eula_accepted: boolean;
  } | null;
  loading: boolean;
  profileError?: string | null;
  refreshProfile?: () => Promise<void>;
};
let mockPathname = "/";
let mockInitialUrl: string | null = null;
let mockStackScreenOptions: { animation?: string } | undefined;
let mockScreenOptionsByName: Record<
  string,
  { animation?: string } | undefined
> = {};
let mockAppStateChange:
  ((nextState: "active" | "background") => void | Promise<void>) | undefined;
let mockVisitorPreviewAccepted = false;
let mockPendingMembershipReturn: {
  intent: "profile";
  returnTo: string | null;
} | null = null;

const mockReplace = jest.fn();
const mockHideAsync = jest.fn(async () => undefined);
const mockGetSession = jest.fn<Promise<unknown>, []>();
const mockResumeGetSession = jest.fn<Promise<unknown>, []>();
const mockIsAuthCallbackUrl = jest.fn((_url: string) => false);
const mockCaptureException = jest.fn();
const mockReportError = jest.fn();
const mockSignOut = jest.fn(async () => {
  await mockAuthStateChange?.("SIGNED_OUT", null);
  return { error: null };
});
const mockRefreshProfile = jest.fn(async () => undefined);
let renderer: ReactTestRenderer | undefined;

jest.mock("@/utils/sentry", () => ({
  Sentry: {
    captureException: (...args: unknown[]) => mockCaptureException(...args),
    wrap: (component: unknown) => component,
  },
}));
jest.mock("@/utils/log", () => ({
  log: jest.fn(),
  reportError: (...args: unknown[]) => mockReportError(...args),
}));
jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      signOut: () => mockSignOut(),
      onAuthStateChange: jest.fn((callback) => {
        mockAuthStateChange = callback;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    },
  },
}));
jest.mock("@/utils/imageCache", () => ({
  __esModule: true,
  default: { loadFromStorage: jest.fn() },
}));
jest.mock("@/utils/authCache", () => ({
  __esModule: true,
  default: {
    loadFromStorage: jest.fn(),
    invalidateCache: jest.fn(),
    onAppStateChange: jest.fn(),
    getSession: () => mockResumeGetSession(),
  },
}));
jest.mock("@/context/profile-context", () => ({
  ProfileProvider: ({ children }: { children: React.ReactNode }) => children,
  useProfile: () => mockProfileState,
}));
jest.mock("@/context/membership-context", () => ({
  MembershipProvider: ({ children }: { children: React.ReactNode }) => children,
  useMembership: () => ({
    isMember: Boolean(mockProfileState?.profile),
    requireMembership: jest.fn(() => Boolean(mockProfileState?.profile)),
    openMembership: jest.fn(),
  }),
}));
jest.mock("@/context/activity-context", () => ({
  ActivityProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/components/share/ShareMenuSheet", () => ({
  ShareMenuProvider: ({ children }: { children: React.ReactNode }) => children,
}));
jest.mock("@/theme", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => children,
  fonts: { bold: "bold", semibold: "semibold", regular: "regular" },
  typography: {
    title: { fontFamily: "bold", fontSize: 22, lineHeight: 28 },
    body: { fontFamily: "regular", fontSize: 16, lineHeight: 24 },
    bodyStrong: { fontFamily: "semibold", fontSize: 16, lineHeight: 24 },
    heading: { fontFamily: "bold", fontSize: 18, lineHeight: 24 },
  },
  makeStyles: () => () => ({}),
  useTheme: () => ({
    colors: {
      background: "white",
      surface: "white",
      accent: "green",
      text: "black",
      textMuted: "gray",
      danger: "red",
    },
    isDark: false,
    preference: "system",
    setPreference: jest.fn(),
  }),
}));
jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));
jest.mock("@/utils/authDeepLink", () => ({
  createSessionFromAuthUrl: jest.fn(),
  isAuthCallbackUrl: (url: string) => mockIsAuthCallbackUrl(url),
}));
jest.mock("@/services/pushNotificationService", () => ({
  retryPendingPushUnregistrationAsync: jest.fn(),
  unregisterPushNotificationsAsync: jest.fn(async () => undefined),
}));
jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));
jest.mock("@/utils/signOut", () => ({
  clearUserCaches: jest.fn(async () => undefined),
}));
jest.mock("@/utils/inviteShare", () => ({
  shareInviteViaSheet: jest.fn(),
}));
jest.mock("@/services/appTrackingTransparencyService", () => ({
  requestAppTrackingTransparencyAsync: jest.fn(),
}));
jest.mock("@/services/appUsageService", () => ({
  trackAppUsage: jest.fn(async () => true),
}));
jest.mock("@/services/visitor-session", () => ({
  acceptVisitorPreview: jest.fn(async () => {
    mockVisitorPreviewAccepted = true;
  }),
  hasAcceptedVisitorPreview: jest.fn(async () => mockVisitorPreviewAccepted),
  getPendingMembershipReturn: jest.fn(async () => mockPendingMembershipReturn),
  clearPendingMembershipReturn: jest.fn(async () => {
    mockPendingMembershipReturn = null;
  }),
  consumePendingMembershipReturn: jest.fn(async () => {
    const pending = mockPendingMembershipReturn;
    mockPendingMembershipReturn = null;
    return pending;
  }),
}));
jest.mock("@/utils/async", () => ({
  withTimeout: jest.fn((promise) => promise),
}));
jest.mock("expo-linking", () => ({
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  getInitialURL: jest.fn(async () => mockInitialUrl),
}));
jest.mock("expo-splash-screen", () => ({
  preventAutoHideAsync: jest.fn(),
  hideAsync: () => mockHideAsync(),
}));
jest.mock("expo-status-bar", () => ({
  StatusBar: () =>
    jest
      .requireActual<typeof import("react")>("react")
      .createElement("StatusBar"),
}));
jest.mock("@expo-google-fonts/figtree", () => ({
  useFonts: () => [true],
  Figtree_300Light: {},
  Figtree_400Regular: {},
  Figtree_500Medium: {},
  Figtree_600SemiBold: {},
  Figtree_700Bold: {},
  Figtree_800ExtraBold: {},
  Figtree_900Black: {},
}));
jest.mock("@expo-google-fonts/dm-mono", () => ({
  DMMono_400Regular: {},
  DMMono_500Medium: {},
}));
jest.mock("react-native-gesture-handler", () => ({
  GestureHandlerRootView: ({ children }: { children: React.ReactNode }) =>
    children,
}));
jest.mock("expo-router", () => {
  const mockReact = jest.requireActual<typeof import("react")>("react");
  const Stack = ({
    children,
    screenOptions,
  }: {
    children: React.ReactNode;
    screenOptions?: { animation?: string };
  }) => {
    mockStackScreenOptions = screenOptions;
    return mockReact.createElement(
      "MountedRoute",
      { pathname: mockPathname },
      children
    );
  };
  Stack.Screen = function MockStackScreen({
    name,
    options,
  }: {
    name: string;
    options?: { animation?: string };
  }) {
    mockScreenOptionsByName[name] = options;
    return null;
  };

  return {
    Stack,
    useRouter: () => ({ replace: mockReplace }),
    usePathname: () => mockPathname,
    useRootNavigationState: () => ({ key: "root" }),
  };
});

describe("root startup routing", () => {
  beforeEach(() => {
    mockAuthStateChange = undefined;
    mockProfileState = {
      profile: null,
      loading: true,
      profileError: null,
      refreshProfile: mockRefreshProfile,
    };
    mockPathname = "/";
    mockInitialUrl = null;
    mockVisitorPreviewAccepted = false;
    mockPendingMembershipReturn = null;
    mockStackScreenOptions = undefined;
    mockScreenOptionsByName = {};
    mockAppStateChange = undefined;
    mockReplace.mockClear();
    mockHideAsync.mockClear();
    mockGetSession.mockReset();
    mockGetSession.mockImplementation(() => new Promise(() => undefined));
    mockResumeGetSession.mockReset();
    mockResumeGetSession.mockResolvedValue({ user: { id: "member-1" } });
    mockIsAuthCallbackUrl.mockReset();
    mockIsAuthCallbackUrl.mockReturnValue(false);
    mockSignOut.mockClear();
    mockRefreshProfile.mockClear();
    Object.defineProperty(AppState, "currentState", {
      configurable: true,
      value: "active",
    });
    jest.spyOn(AppState, "addEventListener").mockImplementation(((
      _event: string,
      callback: typeof mockAppStateChange
    ) => {
      mockAppStateChange = callback;
      return { remove: jest.fn() };
    }) as typeof AppState.addEventListener);
  });

  afterEach(async () => {
    await act(async () => {
      renderer?.unmount();
    });
    renderer = undefined;
    jest.restoreAllMocks();
  });

  it("keeps the router unmounted while an authenticated member's onboarding state is unresolved", async () => {
    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });

    expect(mockAuthStateChange).toBeDefined();

    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", {
        user: { id: "member-1" },
      });
    });

    expect(
      renderer!.root.findAllByType("MountedRoute" as React.ElementType)
    ).toHaveLength(0);
    expect(mockHideAsync).not.toHaveBeenCalled();
  });

  it("keeps a transient profile failure signed in and offers retry", async () => {
    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });

    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", {
        user: { id: "member-1" },
      });
    });

    mockProfileState = {
      profile: null,
      loading: false,
      profileError: "We couldn't load your profile.",
      refreshProfile: mockRefreshProfile,
    };
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });

    expect(mockReplace).not.toHaveBeenCalledWith("/welcome");
    expect(mockHideAsync).toHaveBeenCalledTimes(1);
    const retryControl = renderer!.root
      .findAllByProps({
        accessibilityLabel: "Try loading profile again",
      })
      .find((node) => typeof node.props.onPress === "function");
    expect(retryControl).toBeDefined();

    await act(async () => {
      retryControl!.props.onPress();
    });

    expect(mockRefreshProfile).toHaveBeenCalledTimes(1);

    mockProfileState = {
      profile: {
        id: "member-1",
        username: "olive",
        eula_accepted: true,
      },
      loading: false,
      profileError: null,
      refreshProfile: mockRefreshProfile,
    };
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });

    expect(mockReplace).toHaveBeenLastCalledWith("/home");
  });

  it.each([
    {
      name: "signed out",
      session: null,
      resolvedProfile: { profile: null, loading: false },
      route: "/welcome",
    },
    {
      name: "signed in with onboarding incomplete",
      session: { user: { id: "member-1" } },
      resolvedProfile: {
        profile: {
          id: "member-1",
          username: null,
          eula_accepted: false,
        },
        loading: false,
      },
      route: "/onboarding",
    },
    {
      name: "signed in with onboarding complete",
      session: { user: { id: "member-1" } },
      resolvedProfile: {
        profile: {
          id: "member-1",
          username: "olive",
          eula_accepted: true,
        },
        loading: false,
      },
      route: "/home",
    },
  ])(
    "selects the $name startup route before hiding splash",
    async (scenario) => {
      await act(async () => {
        renderer = create(<RootLayoutNav />);
      });

      await act(async () => {
        await mockAuthStateChange?.("INITIAL_SESSION", scenario.session);
      });

      expect(mockReplace).not.toHaveBeenCalled();
      mockProfileState = scenario.resolvedProfile;
      await act(async () => {
        renderer!.update(<RootLayoutNav />);
      });

      expect(mockReplace).toHaveBeenLastCalledWith(scenario.route);
      expect(mockHideAsync).not.toHaveBeenCalled();

      mockPathname = scenario.route;
      await act(async () => {
        renderer!.update(<RootLayoutNav />);
      });

      expect(mockHideAsync).toHaveBeenCalledTimes(1);
    }
  );

  it("returns an opted-in visitor directly to the club", async () => {
    mockVisitorPreviewAccepted = true;

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", null);
    });
    mockProfileState = { profile: null, loading: false };
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });

    expect(mockReplace).toHaveBeenLastCalledWith("/home");
  });

  it("restores the destination that prompted an existing member to sign in", async () => {
    mockPendingMembershipReturn = { intent: "profile", returnTo: "/profile" };

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", {
        user: { id: "member-1" },
      });
    });

    mockProfileState = {
      profile: {
        id: "member-1",
        username: "olive",
        eula_accepted: true,
      },
      loading: false,
    };
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });

    expect(mockReplace).toHaveBeenLastCalledWith("/profile");
  });

  it("resolves a failed persisted-session read to Welcome", async () => {
    mockProfileState = { profile: null, loading: false };
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("session storage unavailable"),
    });

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });

    expect(mockReplace).toHaveBeenLastCalledWith("/welcome");
    expect(mockHideAsync).not.toHaveBeenCalled();
  });

  it("does not animate from the empty startup gate to the resolved route", async () => {
    mockProfileState = {
      profile: {
        id: "member-1",
        username: "olive",
        eula_accepted: true,
      },
      loading: false,
    };

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", {
        user: { id: "member-1" },
      });
    });

    expect(mockReplace).toHaveBeenLastCalledWith("/home");
    // Startup destinations are statically non-animated: a stack-wide flag
    // that flips after startup can race the in-flight native transition,
    // so the guarantee lives on the screens themselves.
    expect(mockScreenOptionsByName["(tabs)"]?.animation).toBe("none");
    expect(mockScreenOptionsByName["welcome"]?.animation).toBe("none");
    expect(mockScreenOptionsByName["onboarding"]?.animation).toBe("none");
    expect(mockStackScreenOptions?.animation).toBeUndefined();
  });

  it("routes incomplete onboarding before revealing an authenticated deep link", async () => {
    mockInitialUrl = "tinitime://r/review-1";
    mockPathname = "/r/review-1";

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", {
        user: { id: "member-1" },
      });
    });

    mockProfileState = {
      profile: {
        id: "member-1",
        username: null,
        eula_accepted: false,
      },
      loading: false,
    };
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });

    expect(mockReplace).toHaveBeenLastCalledWith("/onboarding");
    expect(mockHideAsync).not.toHaveBeenCalled();
  });

  it("keeps an unauthenticated public deep link in visitor preview", async () => {
    mockInitialUrl = "tinitime://r/review-1";
    mockPathname = "/r/review-1";

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", null);
    });
    mockProfileState = { profile: null, loading: false };
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });

    expect(mockReplace).not.toHaveBeenCalledWith("/welcome");
    expect(mockHideAsync).toHaveBeenCalled();
  });

  it("waits for onboarding state after a fresh sign-in before routing", async () => {
    mockProfileState = { profile: null, loading: false };

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", null);
    });

    mockPathname = "/welcome";
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });
    mockReplace.mockClear();
    mockProfileState = { profile: null, loading: true };

    await act(async () => {
      await mockAuthStateChange?.("SIGNED_IN", {
        user: { id: "member-1" },
      });
    });

    expect(mockReplace).not.toHaveBeenCalled();

    mockProfileState = {
      profile: {
        id: "member-1",
        username: null,
        eula_accepted: false,
      },
      loading: false,
    };
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/onboarding");
    expect(mockReplace).not.toHaveBeenCalledWith("/home");
  });

  it("keeps the splash over an auth callback until its session resolves", async () => {
    mockInitialUrl =
      "tinitime://auth/callback#access_token=AT&refresh_token=RT";
    mockIsAuthCallbackUrl.mockReturnValue(true);
    mockPathname = "/auth/callback";

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", null);
    });

    expect(mockReplace).not.toHaveBeenCalledWith("/welcome");
    expect(mockHideAsync).not.toHaveBeenCalled();

    await act(async () => {
      await mockAuthStateChange?.("SIGNED_IN", {
        user: { id: "member-1" },
      });
    });
    mockProfileState = {
      profile: {
        id: "member-1",
        username: "olive",
        eula_accepted: true,
      },
      loading: false,
    };
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });

    expect(mockReplace).toHaveBeenLastCalledWith("/home");
    expect(mockReplace).not.toHaveBeenCalledWith("/welcome");
  });

  it("continues in visitor preview after logout", async () => {
    mockProfileState = {
      profile: {
        id: "member-1",
        username: "olive",
        eula_accepted: true,
      },
      loading: false,
    };

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", {
        user: { id: "member-1" },
      });
    });

    mockPathname = "/home";
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("SIGNED_OUT", null);
    });

    expect(mockReplace).toHaveBeenLastCalledWith("/home");
  });

  it("keeps an authenticated member in place when a resume session read momentarily returns null", async () => {
    mockProfileState = {
      profile: {
        id: "member-1",
        username: "olive",
        eula_accepted: true,
      },
      loading: false,
    };

    await act(async () => {
      renderer = create(<RootLayoutNav />);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", {
        user: { id: "member-1" },
      });
    });

    mockPathname = "/home";
    await act(async () => {
      renderer!.update(<RootLayoutNav />);
    });
    mockReplace.mockClear();
    mockResumeGetSession.mockResolvedValueOnce(null);

    await act(async () => {
      await mockAppStateChange?.("background");
      await mockAppStateChange?.("active");
    });

    expect(mockResumeGetSession).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalledWith("/welcome");
  });

  it("performs one visitor-preview navigation when Settings signs out", async () => {
    mockProfileState = {
      profile: {
        id: "member-1",
        username: "olive",
        eula_accepted: true,
      },
      loading: false,
    };

    const app = (
      <>
        <RootLayoutNav />
        <Settings />
      </>
    );
    await act(async () => {
      renderer = create(app);
    });
    await act(async () => {
      await mockAuthStateChange?.("INITIAL_SESSION", {
        user: { id: "member-1" },
      });
    });

    mockPathname = "/home";
    await act(async () => {
      renderer!.update(app);
    });
    mockReplace.mockClear();

    const logoutButton = renderer!.root
      .findAllByType(TouchableOpacity)
      .find((node) =>
        node
          .findAllByType(Text)
          .some((textNode) => textNode.props.children === "Logout")
      );

    expect(logoutButton).toBeDefined();
    await act(async () => {
      await logoutButton!.props.onPress();
    });

    expect(mockReplace).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });
});

describe("root error reporting", () => {
  it("forwards caught render errors through the app reporter", async () => {
    const error = new Error("startup render failed");
    let errorRenderer: ReactTestRenderer | undefined;

    await act(async () => {
      errorRenderer = create(<ErrorBoundary error={error} retry={jest.fn()} />);
    });

    expect(mockReportError).toHaveBeenCalledWith(
      "[ErrorBoundary] Render error:",
      error
    );

    await act(async () => errorRenderer?.unmount());
  });
});
