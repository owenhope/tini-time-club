import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { Alert } from "react-native";
import { useLocationFavorite } from "../useLocationFavorite";
import {
  clearFavoritePlacesCache,
  rememberFavorite,
} from "@/services/favoritePlacesCache";

const mockRead = jest.fn();
const mockSave = jest.fn();
const mockGate = jest.fn();
let mockMember: string | undefined = "member";
jest.mock("@/services/locationFavoritesService", () => ({
  getLocationFavorite: (...args: unknown[]) => mockRead(...args),
  setLocationFavorite: (...args: unknown[]) => mockSave(...args),
}));
jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: mockMember ? { id: mockMember } : null }),
}));
jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({ requireMembership: mockGate }),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(callback, [callback]);
  },
}));
let latest: ReturnType<typeof useLocationFavorite>;
let renderer: ReactTestRenderer;
function Harness({ id }: { id: number }) {
  const value = useLocationFavorite(id);
  React.useEffect(() => {
    latest = value;
  }, [value]);
  return null;
}
beforeEach(() => {
  clearFavoritePlacesCache();
  mockMember = "member";
  mockRead.mockReset().mockResolvedValue(false);
  mockSave.mockReset().mockResolvedValue(true);
  mockGate.mockClear();
});
afterEach(() => {
  act(() => renderer?.unmount());
  jest.restoreAllMocks();
});

it("serializes rapid taps and waits for a confirmed save", async () => {
  await act(async () => {
    renderer = create(<Harness id={1} />);
  });
  let finish!: (saved: boolean) => void;
  mockSave.mockImplementation(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      })
  );
  act(() => {
    void latest.toggle();
    void latest.toggle();
  });
  expect(mockSave).toHaveBeenCalledTimes(1);
  expect(latest.saved).toBe(false);
  await act(async () => finish(true));
  expect(latest.saved).toBe(true);
});

it("keeps the confirmed state on a failed unstar", async () => {
  mockRead.mockResolvedValue(true);
  const alert = jest.spyOn(Alert, "alert").mockImplementation(() => {});
  await act(async () => {
    renderer = create(<Harness id={1} />);
  });
  mockSave.mockRejectedValue(new Error("offline"));
  await act(async () => latest.toggle());
  expect(latest.saved).toBe(true);
  expect(alert).toHaveBeenCalled();
});

it("does not apply an old location's response to a new location", async () => {
  let finish!: (saved: boolean) => void;
  mockRead.mockImplementationOnce(
    () =>
      new Promise<boolean>((resolve) => {
        finish = resolve;
      })
  );
  await act(async () => {
    renderer = create(<Harness id={1} />);
  });
  await act(async () => renderer.update(<Harness id={2} />));
  await act(async () => finish(true));
  expect(latest.saved).toBe(false);
});

it("gates visitors without calling a member RPC", async () => {
  mockMember = undefined;
  await act(async () => {
    renderer = create(<Harness id={1} />);
  });
  await act(async () => latest.toggle());
  expect(mockGate).toHaveBeenCalledWith("location-details");
  expect(mockRead).not.toHaveBeenCalled();
  expect(mockSave).not.toHaveBeenCalled();
});

it("opens with a liked place already known, then confirms with the server", async () => {
  rememberFavorite("member", 1, true);
  let answer!: (saved: boolean) => void;
  mockRead.mockImplementation(
    () =>
      new Promise<boolean>((resolve) => {
        answer = resolve;
      })
  );

  await act(async () => {
    renderer = create(<Harness id={1} />);
  });
  // Still waiting on the server, but already liked and not dimmed.
  expect(latest.saved).toBe(true);
  expect(latest.busy).toBe(false);

  await act(async () => answer(true));
  expect(mockRead).toHaveBeenCalledWith("1");
  expect(latest.saved).toBe(true);
});
