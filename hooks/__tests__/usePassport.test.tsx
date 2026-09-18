import React from "react";
import renderer, { act } from "react-test-renderer";
import { usePassport } from "../usePassport";
import { clearMemberPoints } from "@/utils/memberPoints";
import { reconcileMyPassport } from "@/services/passportService";

const mockRpc = jest.fn();
jest.mock("@/utils/supabase", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    auth: {
      getSession: async () => ({
        data: { session: { user: { id: "self" } } },
        error: null,
      }),
    },
  },
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));
jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: { id: "self" } }),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const ReactActual = jest.requireActual<typeof import("react")>("react");
    ReactActual.useEffect(callback, [callback]);
  },
}));
let latest: ReturnType<typeof usePassport>;
function Probe({ id }: { id?: string }) {
  latest = usePassport(id);
  return null;
}
beforeEach(() => {
  clearMemberPoints();
  mockRpc.mockReset();
});

it("does not replace the selected member's Passport with a late previous member response", async () => {
  let finish!: (value: unknown) => void;
  mockRpc.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Probe id="first" />);
  });
  mockRpc.mockResolvedValueOnce({
    data: { points: 500, stamps: [] },
    error: null,
  });
  await act(async () => {
    tree.update(<Probe id="second" />);
  });
  expect(latest.passport?.points).toBe(500);
  await act(async () => {
    finish({ data: { points: 0, stamps: [] }, error: null });
  });
  expect(latest.passport?.points).toBe(500);
  expect(latest.loading).toBe(false);
  act(() => tree.unmount());
});

it("updates the mounted Passport total after reconciliation without a second screen visit", async () => {
  mockRpc.mockResolvedValueOnce({
    data: { points: 0, stamps: [] },
    error: null,
  });
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(<Probe />);
  });
  expect(latest.passport?.points).toBe(0);
  mockRpc.mockResolvedValueOnce({
    data: { points: 500, unlocked: [] },
    error: null,
  });
  await act(async () => {
    await reconcileMyPassport();
  });
  expect(latest.passport?.points).toBe(500);
  act(() => tree.unmount());
});
