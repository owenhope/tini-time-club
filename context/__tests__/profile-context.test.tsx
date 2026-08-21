import React from "react";
import { Alert } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { ProfileProvider, useProfile } from "@/context/profile-context";

const mockReplace = jest.fn();
const mockRouter = { replace: mockReplace };
const mockGetProfile = jest.fn();
const mockGetUser = jest.fn();
const mockInvalidateCache = jest.fn();
const mockClearProfileCache = jest.fn();
const mockSignOut = jest.fn();
const mockSingle = jest.fn();
const mockUnsubscribe = jest.fn();
const mockUnregisterPushNotificationsAsync = jest.fn();
let mockAuthStateChange:
  | ((event: string, session: unknown) => void)
  | undefined;

const mockProfileQuery = {
  select: jest.fn(),
  eq: jest.fn(),
  single: mockSingle,
};

mockProfileQuery.select.mockReturnValue(mockProfileQuery);
mockProfileQuery.eq.mockReturnValue(mockProfileQuery);

jest.mock("expo-router", () => ({
  useRouter: () => mockRouter,
}));

jest.mock("@/utils/authCache", () => ({
  __esModule: true,
  default: {
    getProfile: (...args: unknown[]) => mockGetProfile(...args),
    getUser: (...args: unknown[]) => mockGetUser(...args),
    invalidateCache: (...args: unknown[]) => mockInvalidateCache(...args),
    clearProfileCache: (...args: unknown[]) => mockClearProfileCache(...args),
  },
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    from: () => mockProfileQuery,
    auth: {
      signOut: (...args: unknown[]) => mockSignOut(...args),
      onAuthStateChange: jest.fn((callback) => {
        mockAuthStateChange = callback;
        return {
          data: { subscription: { unsubscribe: mockUnsubscribe } },
        };
      }),
    },
  },
}));

jest.mock("@/services/pushNotificationService", () => ({
  unregisterPushNotificationsAsync: (...args: unknown[]) =>
    mockUnregisterPushNotificationsAsync(...args),
}));

jest.mock("@/utils/log", () => ({
  reportError: jest.fn(),
}));

const signedInUser = { id: "10000000-0000-0000-0000-000000000001" };
let latestContext: ReturnType<typeof useProfile> | undefined;

function ProfileProbe() {
  latestContext = useProfile();
  return null;
}

describe("ProfileProvider profile failures", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    jest.clearAllMocks();
    latestContext = undefined;
    mockGetProfile.mockResolvedValue(null);
    mockGetUser.mockResolvedValue(signedInUser);
    mockInvalidateCache.mockResolvedValue(undefined);
    mockClearProfileCache.mockResolvedValue(undefined);
    mockSignOut.mockResolvedValue({ error: null });
    mockUnregisterPushNotificationsAsync.mockResolvedValue(undefined);
    mockAuthStateChange = undefined;
  });

  afterEach(() => {
    act(() => renderer?.unmount());
  });

  const renderProvider = async () => {
    await act(async () => {
      renderer = create(
        <ProfileProvider>
          <ProfileProbe />
        </ProfileProvider>
      );
      await Promise.resolve();
      await Promise.resolve();
    });
  };

  it("keeps the session when a profile read fails transiently", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST000", message: "Connection unavailable" },
    });

    await renderProvider();

    expect(latestContext?.loading).toBe(false);
    expect(latestContext?.profile).toBeNull();
    expect(latestContext?.profileError).toBe(
      "We couldn't load your profile. Check your connection and try again."
    );
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockInvalidateCache).not.toHaveBeenCalled();
  });

  it("keeps a cached profile visible when a refresh fails", async () => {
    const cachedProfile = {
      id: signedInUser.id,
      username: "olive",
      is_verified: false,
    };
    mockGetProfile.mockResolvedValue(cachedProfile);

    await renderProvider();

    mockGetProfile.mockResolvedValue(null);
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST000", message: "Connection unavailable" },
    });
    await act(async () => {
      await latestContext?.refreshProfile();
    });

    expect(latestContext?.profile).toEqual(cachedProfile);
    expect(latestContext?.profileError).toBe(
      "We couldn't load your profile. Check your connection and try again."
    );
    expect(mockSignOut).not.toHaveBeenCalled();
  });

  it("signs out when the authenticated account profile is gone", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { code: "PGRST116", message: "No rows returned" },
    });
    jest.spyOn(Alert, "alert").mockImplementation(() => undefined);

    await renderProvider();

    expect(mockUnregisterPushNotificationsAsync).toHaveBeenCalled();
    expect(mockInvalidateCache).toHaveBeenCalled();
    expect(mockSignOut).toHaveBeenCalledWith();
    expect(Alert.alert).toHaveBeenCalledWith(
      "Signed out",
      "This account is no longer available. Please sign in again."
    );
  });

  it("ignores an in-flight profile result after logout", async () => {
    let resolveProfile!: (profile: typeof signedInUser) => void;
    mockGetProfile.mockReturnValue(
      new Promise((resolve) => {
        resolveProfile = resolve;
      })
    );

    await act(async () => {
      renderer = create(
        <ProfileProvider>
          <ProfileProbe />
        </ProfileProvider>
      );
      await Promise.resolve();
    });

    expect(mockAuthStateChange).toBeDefined();

    await act(async () => {
      mockAuthStateChange?.("SIGNED_OUT", null);
      expect(latestContext?.profile).toBeNull();
      resolveProfile(signedInUser);
      await Promise.resolve();
    });

    expect(latestContext?.profile).toBeNull();
  });
});
