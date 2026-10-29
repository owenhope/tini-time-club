import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Alert, AppState } from "react-native";
import CameraComponent from "@/components/CameraComponent";
import { reportError } from "@/utils/log";

const mockRequestPermission = jest.fn();
const mockTakePicture = jest.fn();
let mockPermission = { granted: false, canAskAgain: true };
let mockFocusEffect: (() => void) | undefined;

jest.mock("expo-camera", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const CameraView = React.forwardRef(
    (_props: object, ref: React.Ref<unknown>) => {
      React.useImperativeHandle(ref, () => ({
        takePictureAsync: mockTakePicture,
      }));
      return null;
    }
  );
  CameraView.displayName = "CameraView";
  return {
    CameraView,
    useCameraPermissions: () => [mockPermission, mockRequestPermission],
  };
});

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
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Medium: "medium" },
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: () => null }));
jest.mock("@/components/nav/AppHeader", () => () => null);
jest.mock("@/utils/log", () => ({ reportError: jest.fn(), warn: jest.fn() }));

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
    mockTakePicture.mockReset();
    (reportError as jest.Mock).mockClear();
    mockPermission = { granted: false, canAskAgain: true };
    mockFocusEffect = undefined;
  });

  afterEach(() => {
    act(() => renderer?.unmount());
    jest.restoreAllMocks();
  });

  const pressShutter = async () => {
    const shutter = renderer!.root.findByProps({
      accessibilityLabel: "Take photo",
    });
    await act(async () => {
      await shutter.props.onPress();
    });
  };

  it.each([
    ["background", false],
    ["active", true],
  ])(
    "on a failed capture with the app %s, reports and alerts: %s",
    async (appState, reported) => {
      mockPermission = { granted: true, canAskAgain: true };
      mockTakePicture.mockRejectedValue(new Error("Failed to capture image"));
      const realState = Object.getOwnPropertyDescriptor(
        AppState,
        "currentState"
      )!;
      Object.defineProperty(AppState, "currentState", {
        value: appState,
        configurable: true,
      });
      const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
      act(() => {
        renderer = create(<CameraComponent onCapture={jest.fn()} />);
      });

      await pressShutter();

      expect(reportError).toHaveBeenCalledTimes(reported ? 1 : 0);
      expect(alert).toHaveBeenCalledTimes(reported ? 1 : 0);
      Object.defineProperty(AppState, "currentState", realState);
    }
  );

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
