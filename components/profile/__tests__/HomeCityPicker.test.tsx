import React from "react";
import renderer, { act } from "react-test-renderer";
import {
  AppState,
  Linking,
  TextInput,
  type AppStateStatus,
} from "react-native";
import HomeCityPicker from "../HomeCityPicker";
import Button from "@/components/shared/Button";
import { ThemeProvider } from "@/theme";
import {
  searchCities,
  selectCity,
  saveHomeCity,
  detectHomeCity,
  hasHomeCityLocationPermission,
  HomeCityPermissionDeniedError,
} from "@/services/homeCityService";

const city = {
  name: "Vancouver",
  region: "BC",
  country: "Canada",
  place_id: "city",
  source: "manual" as const,
};
jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(async () => null),
  setItem: jest.fn(async () => {}),
}));
jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({
    profile: { id: "member" },
    refreshProfile: jest.fn(async () => {}),
  }),
}));
jest.mock("@/context/passport-toast-context", () => ({
  PassportToastContext: jest
    .requireActual<typeof React>("react")
    .createContext({
      showPassportStamps: jest.fn(),
    }),
}));
jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));
jest.mock("@/services/homeCityService", () => ({
  cityLabel: (city: { name: string }) => city.name,
  createCitySession: () => "session",
  searchCities: jest.fn(),
  selectCity: jest.fn(),
  saveHomeCity: jest.fn(),
  detectHomeCity: jest.fn(),
  hasHomeCityLocationPermission: jest.fn(),
  HomeCityPermissionDeniedError: class HomeCityPermissionDeniedError extends Error {},
}));
let tree: renderer.ReactTestRenderer;
const next = jest.fn();
const button = (title: string) =>
  tree.root.findAllByType(Button).find((node) => node.props.title === title)!;
async function enterWithAutoDetect() {
  await act(async () => {
    tree.unmount();
    tree = renderer.create(
      <ThemeProvider>
        <HomeCityPicker origin="onboarding" autoDetect onContinue={next} />
      </ThemeProvider>
    );
  });
}
beforeEach(async () => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest
    .mocked(searchCities)
    .mockResolvedValue([{ id: "city", label: "Vancouver, BC, Canada" }]);
  jest.mocked(selectCity).mockResolvedValue(city);
  jest.mocked(saveHomeCity).mockResolvedValue([]);
  await act(async () => {
    tree = renderer.create(
      <ThemeProvider>
        <HomeCityPicker origin="onboarding" onContinue={next} />
      </ThemeProvider>
    );
  });
});
afterEach(() => {
  act(() => tree.unmount());
  jest.useRealTimers();
});
it("can skip without requesting permission or saving", async () => {
  await act(async () => button("Skip for now").props.onPress());
  expect(next).toHaveBeenCalledTimes(1);
  expect(detectHomeCity).not.toHaveBeenCalled();
  expect(saveHomeCity).not.toHaveBeenCalled();
});
it("requires a city result, then saves the chosen city before continuing", async () => {
  await act(async () =>
    tree.root.findByType(TextInput).props.onChangeText("Van")
  );
  expect(button("Save city & continue").props.disabled).toBe(true);
  await act(async () => jest.advanceTimersByTime(300));
  expect(searchCities).toHaveBeenCalledWith(
    "Van",
    "session",
    expect.anything()
  );
  const suggestion = tree.root.findAllByProps({
    accessibilityLabel: "Select Vancouver, BC, Canada",
  })[0];
  await act(async () => suggestion.props.onPress());
  expect(button("Save city & continue").props.disabled).toBe(false);
  expect(tree.root.findByType(TextInput).props.value).toBe("Vancouver");
  await act(async () => button("Save city & continue").props.onPress());
  expect(saveHomeCity).toHaveBeenCalledWith(city, "onboarding");
  expect(next).toHaveBeenCalledTimes(1);
});
it("keeps skip and manual entry available after location denial", async () => {
  jest
    .mocked(detectHomeCity)
    .mockRejectedValue(new Error("Location access is off."));
  await enterWithAutoDetect();
  expect(button("Skip for now").props.disabled).toBe(false);
  expect(tree.root.findByType(TextInput).props.editable).toBe(true);
  expect(saveHomeCity).not.toHaveBeenCalled();
});
it("does not advance after a failed save", async () => {
  jest.mocked(detectHomeCity).mockResolvedValue(city);
  jest.mocked(saveHomeCity).mockRejectedValue(new Error("Couldn't save"));
  await enterWithAutoDetect();
  await act(async () => button("Save city & continue").props.onPress());
  expect(next).not.toHaveBeenCalled();
  expect(
    tree.root.findAllByProps({ accessibilityRole: "alert" }).length
  ).toBeGreaterThan(0);
  expect(button("Save city & continue").props.disabled).toBe(false);
});

it("automatically detects the city on onboarding entry without saving it", async () => {
  jest.mocked(detectHomeCity).mockResolvedValue(city);
  const onBusyChange = jest.fn();
  await act(async () => {
    tree.unmount();
    tree = renderer.create(
      <ThemeProvider>
        <HomeCityPicker
          origin="onboarding"
          autoDetect
          onBusyChange={onBusyChange}
          onContinue={next}
        />
      </ThemeProvider>
    );
  });
  expect(detectHomeCity).toHaveBeenCalledTimes(1);
  expect(button("Use my location")).toBeUndefined();
  expect(tree.root.findByType(TextInput).props.value).toBe("Vancouver");
  expect(onBusyChange).toHaveBeenLastCalledWith(false);
  expect(button("Save city & continue").props.disabled).toBe(false);
  expect(saveHomeCity).not.toHaveBeenCalled();
});

it("allows manual selection or skipping when the automatic request is denied", async () => {
  jest
    .mocked(detectHomeCity)
    .mockRejectedValue(new Error("Location access is off."));
  await act(async () => {
    tree.unmount();
    tree = renderer.create(
      <ThemeProvider>
        <HomeCityPicker origin="onboarding" autoDetect onContinue={next} />
      </ThemeProvider>
    );
  });
  expect(tree.root.findByType(TextInput).props.editable).toBe(true);
  await act(async () => button("Skip for now").props.onPress());
  expect(next).toHaveBeenCalledTimes(1);
  expect(saveHomeCity).not.toHaveBeenCalled();
});

it("clears a selected city through the shared search control", async () => {
  jest.mocked(detectHomeCity).mockResolvedValue(city);
  await enterWithAutoDetect();
  expect(tree.root.findByType(TextInput).props.value).toBe("Vancouver");
  const clear = tree.root.findAllByProps({
    accessibilityLabel: "Clear search",
  })[0];
  await act(async () => clear.props.onPress());
  expect(tree.root.findByType(TextInput).props.value).toBe("");
  expect(button("Save city & continue").props.disabled).toBe(true);
  expect(saveHomeCity).not.toHaveBeenCalled();
});

it("does not show a repeated location error after a city has been selected", async () => {
  jest
    .mocked(detectHomeCity)
    .mockRejectedValue(new Error("Location access is off."));
  await enterWithAutoDetect();
  expect(
    tree.root.findAllByProps({ accessibilityRole: "alert" }).length
  ).toBeGreaterThan(0);
  await act(async () =>
    tree.root.findByType(TextInput).props.onChangeText("Van")
  );
  await act(async () => jest.advanceTimersByTime(300));
  await act(async () =>
    tree.root
      .findAllByProps({ accessibilityLabel: "Select Vancouver, BC, Canada" })[0]
      .props.onPress()
  );
  await act(async () =>
    tree.update(
      <ThemeProvider>
        <HomeCityPicker
          origin="onboarding"
          autoDetect
          onContinue={next}
          onBusyChange={jest.fn()}
        />
      </ThemeProvider>
    )
  );
  expect(tree.root.findByType(TextInput).props.value).toBe("Vancouver");
  expect(button("Save city & continue").props.disabled).toBe(false);
  expect(tree.root.findAllByProps({ accessibilityRole: "alert" })).toHaveLength(
    0
  );
});

it("offers Settings after denial and fills the input when access is enabled", async () => {
  let onStateChange: ((state: AppStateStatus) => void) | undefined;
  const subscription = jest
    .spyOn(AppState, "addEventListener")
    .mockImplementation((_event, listener) => {
      onStateChange = listener;
      return { remove: jest.fn() };
    });
  const openSettings = jest.spyOn(Linking, "openSettings").mockResolvedValue();
  jest
    .mocked(detectHomeCity)
    .mockRejectedValueOnce(new HomeCityPermissionDeniedError());
  await enterWithAutoDetect();
  expect(button("Open Settings")).toBeDefined();
  await act(async () => button("Open Settings").props.onPress());
  expect(openSettings).toHaveBeenCalledTimes(1);
  jest.mocked(hasHomeCityLocationPermission).mockResolvedValue(true);
  jest.mocked(detectHomeCity).mockResolvedValue(city);
  await act(async () => onStateChange?.("active"));
  expect(tree.root.findByType(TextInput).props.value).toBe("Vancouver");
  expect(button("Open Settings")).toBeUndefined();
  expect(saveHomeCity).not.toHaveBeenCalled();
  subscription.mockRestore();
  openSettings.mockRestore();
});
