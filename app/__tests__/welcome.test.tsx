import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import Welcome from "@/app/welcome";

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockAcceptVisitorPreview = jest.fn(async () => undefined);
const mockCapture = jest.fn();
const mockBeginSignOut = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace, push: mockPush }),
}));

jest.mock("@/services/visitor-session", () => ({
  acceptVisitorPreview: () => mockAcceptVisitorPreview(),
}));

jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: (...args: unknown[]) => mockCapture(...args) },
}));

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ beginSignOut: mockBeginSignOut }),
}));

jest.mock("@/components/shared", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    Button: (props: object) => React.createElement("Button", props),
    MartiniIcon: (props: object) => React.createElement("MartiniIcon", props),
  };
});

jest.mock("@/theme", () => {
  const theme = {
    colors: {
      accent: "accent",
      like: "like",
      scrim: "scrim",
      scrimStrong: "scrim-strong",
      secondary: "secondary",
      surfaceInkDeep: "ink",
      tabBarActive: "active",
      textOnImage: "white",
    },
    radius: { pill: 999 },
    spacing: { sm: 8, md: 16, lg: 24, xl: 32 },
    typography: { bodyStrong: {}, caption: {}, heading: {} },
  };

  return {
    makeStyles: (factory: (value: typeof theme) => object) => () =>
      factory(theme),
    useTheme: () => theme,
  };
});

jest.mock("expo-image", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return { Image: (props: object) => React.createElement("Image", props) };
});

jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("@expo/vector-icons", () => ({
  MaterialCommunityIcons: () => null,
}));

describe("Welcome", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    mockReplace.mockClear();
    mockPush.mockClear();
    mockAcceptVisitorPreview.mockClear();
    mockCapture.mockClear();
    mockBeginSignOut.mockClear();
  });

  afterEach(() => {
    act(() => renderer?.unmount());
  });

  it("invites signed-out users to discover Martinis and opens the visitor feed", async () => {
    act(() => {
      renderer = create(<Welcome />);
    });

    const discover = renderer!.root.findByProps({
      title: "Discover Martinis",
    });

    await act(async () => {
      discover.props.onPress();
      await Promise.resolve();
    });

    expect(mockCapture).toHaveBeenCalledWith("visitor_preview_started", {
      source: "welcome",
    });
    expect(mockAcceptVisitorPreview).toHaveBeenCalledTimes(1);
    expect(mockBeginSignOut).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledWith("/home");
    expect(mockPush).not.toHaveBeenCalled();
  });
});
