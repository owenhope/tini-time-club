import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  MembershipProvider,
  useMembership,
} from "@/context/membership-context";

const mockPush = jest.fn();
let mockPathname = "/home";

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => mockPathname,
}));

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: null }),
}));

jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

const Consumer = ({
  onReady,
}: {
  onReady: (value: ReturnType<typeof useMembership>) => void;
}) => {
  onReady(useMembership());
  return null;
};

describe("openMembership double-fire guard", () => {
  let renderer: ReactTestRenderer | undefined;
  let membership: ReturnType<typeof useMembership>;

  const renderProvider = async () => {
    await act(async () => {
      renderer = create(
        <MembershipProvider>
          <Consumer
            onReady={(value) => {
              membership = value;
            }}
          />
        </MembershipProvider>
      );
    });
  };

  beforeEach(() => {
    mockPush.mockClear();
    mockPathname = "/home";
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => renderer?.unmount());
    jest.useRealTimers();
  });

  it("presents exactly one sheet for a rapid double fire", async () => {
    await renderProvider();

    act(() => {
      membership.openMembership("review");
      membership.openMembership("review");
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("ignores opens while the sheet route is already current", async () => {
    await renderProvider();

    act(() => {
      membership.openMembership("review");
    });
    mockPathname = "/membership";
    await act(async () => {
      renderer!.update(
        <MembershipProvider>
          <Consumer
            onReady={(value) => {
              membership = value;
            }}
          />
        </MembershipProvider>
      );
    });
    act(() => {
      jest.advanceTimersByTime(5_000);
      membership.openMembership("comment");
    });

    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it("allows a fresh open after the sheet is gone and the window passed", async () => {
    await renderProvider();

    act(() => {
      membership.openMembership("review");
    });
    act(() => {
      jest.advanceTimersByTime(701);
      membership.openMembership("comment");
    });

    expect(mockPush).toHaveBeenCalledTimes(2);
  });
});
