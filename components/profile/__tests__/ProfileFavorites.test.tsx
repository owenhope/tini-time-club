import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import ProfileFavorites from "../ProfileFavorites";

const mockPage = jest.fn();
jest.mock("@/services/locationFavoritesService", () => ({
  getProfileFavorites: (...args: unknown[]) => mockPage(...args),
}));
jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: { id: "viewer" } }),
}));
jest.mock("expo-router", () => ({
  useFocusEffect: (callback: () => void) => {
    const React = jest.requireActual<typeof import("react")>("react");
    React.useEffect(callback, [callback]);
  },
}));
jest.mock(
  "react-native",
  () =>
    new Proxy(jest.requireActual("react-native"), {
      get(target, key) {
        return key === "FlatList" ? "FlatList" : target[key];
      },
    })
);
jest.mock("@/components/RegularPlaceRow", () => "PlaceRow");
jest.mock("@/components/shared", () => ({ AppText: "AppText" }));
jest.mock("@/utils/native-tab-bar-insets", () => ({
  useNativeTabBarContentInset: () => 0,
}));
jest.mock("@/theme", () => ({
  makeStyles: () => () => ({}),
  useTheme: () => ({ colors: { accent: "green" } }),
}));
let renderer: ReactTestRenderer;
const list = () => renderer.root.findByType("FlatList" as React.ElementType);
const place = (id: number) => ({
  location_id: id,
  location_name: `Place ${id}`,
});
beforeEach(() => mockPage.mockReset());
afterEach(() => act(() => renderer?.unmount()));

it("appends the next page once and stops when there is no cursor", async () => {
  const cursor = { savedAt: "2026-10-18T00:00:00Z", locationId: 1 };
  mockPage.mockResolvedValueOnce({ items: [place(1)], cursor });
  await act(async () => {
    renderer = create(<ProfileFavorites profileId="member" header={<></>} />);
  });
  mockPage.mockResolvedValueOnce({ items: [place(2)], cursor: null });
  await act(async () => {
    list().props.onEndReached();
    list().props.onEndReached();
  });
  expect(mockPage).toHaveBeenCalledTimes(2);
  expect(mockPage).toHaveBeenLastCalledWith("member", cursor);
  expect(
    list().props.data.map((item: { location_id: number }) => item.location_id)
  ).toEqual([1, 2]);
  await act(async () => list().props.onEndReached());
  expect(mockPage).toHaveBeenCalledTimes(2);
});

it("ignores a late response after navigating to another profile", async () => {
  let finish!: (page: unknown) => void;
  mockPage.mockImplementationOnce(
    () =>
      new Promise((resolve) => {
        finish = resolve;
      })
  );
  await act(async () => {
    renderer = create(<ProfileFavorites profileId="first" header={<></>} />);
  });
  mockPage.mockResolvedValueOnce({ items: [place(2)], cursor: null });
  await act(async () =>
    renderer.update(<ProfileFavorites profileId="second" header={<></>} />)
  );
  await act(async () => finish({ items: [place(1)], cursor: null }));
  expect(
    list().props.data.map((item: { location_id: number }) => item.location_id)
  ).toEqual([2]);
});
