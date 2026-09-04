import React from "react";
import renderer, { act } from "react-test-renderer";
import { Alert, AppState, Linking, type AppStateStatus } from "react-native";
import { useAppUpdatePrompt } from "@/hooks/useAppUpdatePrompt";
import { checkForAppStoreUpdate } from "@/services/appVersionService";
import { requestAppTrackingTransparencyAsync } from "@/services/appTrackingTransparencyService";

jest.mock("@/services/appVersionService", () => ({
  checkForAppStoreUpdate: jest.fn(),
}));
jest.mock("@/services/appTrackingTransparencyService", () => ({
  requestAppTrackingTransparencyAsync: jest.fn(async () => {}),
}));

const update = {
  installedVersion: "4.1.0",
  latestVersion: "4.2.0",
  storeUrl: "https://apps.apple.com/app/id123",
};
const check = jest.mocked(checkForAppStoreUpdate);
function Probe({ ready = true }: { ready?: boolean }) {
  useAppUpdatePrompt(ready);
  return null;
}

describe("useAppUpdatePrompt", () => {
  let root: renderer.ReactTestRenderer;
  let change: (state: AppStateStatus) => void;
  let remove: jest.Mock;
  const initialState = AppState.currentState;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(1_000_000);
    AppState.currentState = "active";
    check.mockReset().mockResolvedValue(update);
    remove = jest.fn();
    jest
      .spyOn(AppState, "addEventListener")
      .mockImplementation((_event, listener) => {
        change = listener;
        return { remove };
      });
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
  });
  afterEach(async () => {
    if (root) await act(async () => root.unmount());
    jest.restoreAllMocks();
    jest.useRealTimers();
    AppState.currentState = initialState;
  });
  const foreground = async () => {
    await act(async () => {
      AppState.currentState = "active";
      change("active");
    });
  };
  const mount = async (ready = true) => {
    await act(async () => {
      root = renderer.create(<Probe ready={ready} />);
    });
  };

  it("waits for startup readiness and tracking permission completion", async () => {
    let finish!: () => void;
    jest.mocked(requestAppTrackingTransparencyAsync).mockReturnValueOnce(
      new Promise<void>((resolve) => {
        finish = resolve;
      })
    );
    await mount(false);
    expect(check).not.toHaveBeenCalled();
    await act(async () => root.update(<Probe />));
    expect(check).not.toHaveBeenCalled();
    await act(async () => finish());
    expect(Alert.alert).toHaveBeenCalledTimes(1);
  });

  it("defers a background result until foreground and respects dismissal cooldown", async () => {
    let finish!: (value: typeof update) => void;
    check.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    await mount();
    await act(async () => {
      AppState.currentState = "background";
      change("background");
      finish(update);
    });
    expect(Alert.alert).not.toHaveBeenCalled();
    await foreground();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    const buttons = jest.mocked(Alert.alert).mock.calls[0][2]!;
    buttons[0].onPress!();
    await foreground();
    expect(Alert.alert).toHaveBeenCalledTimes(1);
    jest.setSystemTime(Date.now() + 12 * 60 * 60 * 1000);
    await foreground();
    expect(Alert.alert).toHaveBeenCalledTimes(2);
  });

  it("ignores a result after unmount and removes the listener", async () => {
    let finish!: (value: typeof update) => void;
    check.mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    );
    await mount();
    await act(async () => root.unmount());
    await act(async () => finish(update));
    expect(Alert.alert).not.toHaveBeenCalled();
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it("handles store-opening failure without an unhandled rejection", async () => {
    jest
      .mocked(Linking.openURL)
      .mockRejectedValueOnce(new Error("unavailable"));
    await mount();
    await act(async () => {
      jest.mocked(Alert.alert).mock.calls[0][2]![1].onPress!();
    });
    expect(Linking.openURL).toHaveBeenCalledWith(update.storeUrl);
    await foreground();
    expect(Alert.alert).toHaveBeenCalledTimes(2);
  });
});
