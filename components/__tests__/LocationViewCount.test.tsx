import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import LocationViewCount from "../LocationViewCount";

const mockRecord = jest.fn();
let mockMemberId: string | undefined = "member";
jest.mock("@/services/locationViewsService", () => ({
  recordLocationView: (...args: unknown[]) => mockRecord(...args),
}));
jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: mockMemberId ? { id: mockMemberId } : null }),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(effect, [effect]);
  },
}));
jest.mock("@expo/vector-icons", () => ({ Ionicons: "Ionicons" }));
jest.mock("@/theme", () => ({
  makeStyles: () => () => ({}),
  useTheme: () => ({ colors: {} }),
}));

let renderer: ReactTestRenderer;
beforeEach(() => {
  mockMemberId = "member";
  mockRecord.mockReset().mockResolvedValue(1);
});
afterEach(() => act(() => renderer?.unmount()));

it("ignores a response for the previous location after switching pins", async () => {
  let finishFirst!: (count: number) => void;
  mockRecord.mockImplementationOnce(
    () =>
      new Promise<number>((resolve) => {
        finishFirst = resolve;
      })
  );
  await act(async () => {
    renderer = create(<LocationViewCount locationId={1} />);
  });
  await act(async () => {
    renderer.update(<LocationViewCount locationId={2} />);
  });
  await act(async () => finishFirst(999));
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: "1 view" }).length
  ).toBeGreaterThan(0);
  expect(
    renderer.root.findAllByProps({ accessibilityLabel: "999 views" })
  ).toHaveLength(0);
  await act(async () =>
    renderer.update(<LocationViewCount locationId={2} onBrand />)
  );
  expect(mockRecord).toHaveBeenCalledTimes(2);
});

it("does not record views on hidden map details or for a signed-out member", async () => {
  await act(async () => {
    renderer = create(<LocationViewCount locationId={1} enabled={false} />);
  });
  expect(mockRecord).not.toHaveBeenCalled();
  mockMemberId = undefined;
  await act(async () => renderer.update(<LocationViewCount locationId={1} />));
  expect(mockRecord).not.toHaveBeenCalled();
});

it("hides an unavailable count", async () => {
  mockRecord.mockResolvedValue(null);
  await act(async () => {
    renderer = create(<LocationViewCount locationId={1} />);
  });
  expect(renderer.toJSON()).toBeNull();
});
