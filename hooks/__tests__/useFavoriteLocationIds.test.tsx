import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { useFavoriteLocationIds } from "../useFavoriteLocationIds";

const mockPage = jest.fn();
let mockMember: string | undefined = "member";
jest.mock("@/services/locationFavoritesService", () => ({
  getProfileFavorites: (...args: unknown[]) => mockPage(...args),
}));
jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: mockMember ? { id: mockMember } : null }),
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(callback, [callback]);
  },
}));

let latest: ReadonlySet<string>;
let renderer: ReactTestRenderer;
function Harness() {
  const ids = useFavoriteLocationIds();
  React.useEffect(() => {
    latest = ids;
  }, [ids]);
  return null;
}
const page = (ids: number[], cursor: unknown = null) => ({
  items: ids.map((id) => ({ location_id: id })),
  cursor,
});

beforeEach(() => {
  mockMember = "member";
  mockPage.mockReset();
});
afterEach(() => {
  act(() => renderer?.unmount());
});

it("collects every page of the member's favorites", async () => {
  const cursor = { savedAt: "2026-10-01T00:00:00Z", locationId: 2 };
  mockPage
    .mockResolvedValueOnce(page([1, 2], cursor))
    .mockResolvedValueOnce(page([3]));

  await act(async () => {
    renderer = create(<Harness />);
  });

  expect(mockPage).toHaveBeenNthCalledWith(1, "member", null);
  expect(mockPage).toHaveBeenNthCalledWith(2, "member", cursor);
  expect([...latest]).toEqual(["1", "2", "3"]);
});

it("loads nothing for a visitor", async () => {
  mockMember = undefined;
  await act(async () => {
    renderer = create(<Harness />);
  });

  expect(mockPage).not.toHaveBeenCalled();
  expect(latest.size).toBe(0);
});
