import React from "react";
import renderer, { act } from "react-test-renderer";
import { Text } from "react-native";
import UserFollowList from "@/components/UserFollowList";

const mockParams = { username: "tini" };
const mockFrom = jest.fn();
const mockNativeText = Text;

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
}));
jest.mock("@/utils/supabase", () => ({
  supabase: { from: (...args: unknown[]) => mockFrom(...args) },
}));
jest.mock("@/utils/log", () => ({ reportError: jest.fn() }));
jest.mock("@/components/ProfileList", () => ({
  __esModule: true,
  default: ({ profiles }: { profiles: { username: string }[] }) =>
    jest
      .requireActual<typeof import("react")>("react")
      .createElement(mockNativeText, null, profiles[0]?.username),
}));
jest.mock("@/theme", () => ({
  makeStyles: (factory: (theme: any) => unknown) => () =>
    factory({
      colors: {
        background: "white",
        accent: "blue",
        textSecondary: "gray",
        onAccent: "white",
      },
      spacing: { md: 8, xl: 16 },
      typography: { body: {}, bodyStrong: {} },
      radius: { pill: 99 },
    }),
  useTheme: () => ({
    colors: { accent: "blue" },
  }),
}));

const profile = { id: "profile-1" };
const follower = {
  id: "follower-1",
  username: "new-follower",
  avatar_url: null,
  is_verified: false,
  review_count: 1,
};

const chainFor = (result: unknown) => {
  const chain: Record<string, jest.Mock> = {};
  chain.select = jest.fn(() => chain);
  chain.eq = jest.fn(() => chain);
  chain.single = jest.fn(() => Promise.resolve(result));
  chain.limit = jest.fn(() => Promise.resolve(result));
  return chain;
};

describe("UserFollowList", () => {
  it("retries the failed list request", async () => {
    mockFrom.mockReset();
    mockFrom
      .mockReturnValueOnce(
        chainFor({ data: null, error: new Error("offline") })
      )
      .mockReturnValueOnce(chainFor({ data: profile, error: null }))
      .mockReturnValueOnce(
        chainFor({ data: [{ profiles: follower }], error: null })
      );

    let tree: renderer.ReactTestRenderer;
    act(() => {
      tree = renderer.create(<UserFollowList direction="followers" />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const retry = tree!.root.findByProps({ accessibilityRole: "button" });
    await act(async () => {
      retry.props.onPress();
      await Promise.resolve();
    });

    expect(tree!.root.findByType(Text).props.children).toBe("new-follower");
    expect(mockFrom).toHaveBeenCalledTimes(3);
    act(() => tree!.unmount());
  });
});
