import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import CameraComponent from "@/components/CameraComponent";

const mockRequestPermission = jest.fn();
let mockFocusEffect: (() => void) | undefined;

jest.mock("expo-camera", () => ({
  CameraView: () => null,
  useCameraPermissions: () => [
    { granted: false, canAskAgain: true },
    mockRequestPermission,
  ],
}));

jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) => {
    mockFocusEffect = effect;
  },
}));

jest.mock("react-native-safe-area-context", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    SafeAreaView: (props: object) => React.createElement("SafeAreaView", props),
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock("expo-image-picker", () => ({}));
jest.mock("expo-haptics", () => ({}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@/components/nav/AppHeader", () => () => null);
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));

jest.mock("@/theme", () => {
  // Any token lookup resolves to a placeholder; layout is not under test.
  const theme = new Proxy(
    {},
    {
      get: () =>
        new Proxy({}, { get: (_target, key) => (key === "pill" ? 999 : 1) }),
    }
  );
  return {
    makeStyles: (factory: (value: unknown) => object) => () => factory(theme),
    useTheme: () => theme,
  };
});

describe("CameraComponent", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    mockRequestPermission.mockClear();
    mockFocusEffect = undefined;
  });

  afterEach(() => {
    act(() => renderer?.unmount());
  });

  it("asks for camera access only once the screen is focused", () => {
    act(() => {
      renderer = create(<CameraComponent onCapture={jest.fn()} />);
    });

    // Mounted in a background tab: no prompt yet.
    expect(mockRequestPermission).not.toHaveBeenCalled();

    act(() => mockFocusEffect?.());

    expect(mockRequestPermission).toHaveBeenCalledTimes(1);
  });
});
