import { clearMemberPoints } from "@/utils/memberPoints";
import { getMemberPassport } from "@/services/passportService";
import { supabase } from "@/utils/supabase";
import React from "react";
import { Image, Text } from "react-native";
import renderer, { act } from "react-test-renderer";
import MemberAvatar from "../MemberAvatar";
import { ThemeProvider } from "@/theme";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock"
  )
);

jest.mock("@/utils/imageCache", () => ({
  __esModule: true,
  default: { getAvatarUrlSync: (path: string | null) => path },
}));

beforeEach(() => clearMemberPoints());

it("renders a member's points and initials, clearing rank when identity data disappears", async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <ThemeProvider>
        <MemberAvatar member={{ username: "olive", passport_points: 500 }} />
      </ThemeProvider>
    );
  });
  expect(
    tree.root.findByProps({ accessibilityLabel: "Premium rank" })
  ).toBeTruthy();
  expect(tree.root.findByType(Text).props.children).toBe("O");
  await act(async () => {
    tree.update(
      <ThemeProvider>
        <MemberAvatar member={{ username: "twist", passport_points: 0 }} />
      </ThemeProvider>
    );
  });
  expect(
    tree.root.findByProps({ accessibilityLabel: "Well rank" })
  ).toBeTruthy();
  expect(tree.root.findByType(Text).props.children).toBe("T");
  await act(async () => {
    tree.update(
      <ThemeProvider>
        <MemberAvatar />
      </ThemeProvider>
    );
  });
  expect(
    tree.root.findAllByProps({ accessibilityLabel: "Well rank" })
  ).toHaveLength(0);
  act(() => tree.unmount());
});

it("retries a changed photo after the old photo failed", async () => {
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <ThemeProvider>
        <MemberAvatar member={{ username: "olive", avatar_url: "old.jpg" }} />
      </ThemeProvider>
    );
  });
  act(() => tree.root.findByType(Image).props.onError());
  expect(tree.root.findByType(Text).props.children).toBe("O");
  await act(async () => {
    tree.update(
      <ThemeProvider>
        <MemberAvatar member={{ username: "olive", avatar_url: "new.jpg" }} />
      </ThemeProvider>
    );
  });
  expect(tree.root.findByType(Image).props.source.uri).toBe("new.jpg");
  act(() => tree.unmount());
});

jest.mock("@/utils/supabase", () => ({
  supabase: { rpc: jest.fn() },
}));

it("updates mounted comment and Regular avatars when a Passport read confirms new points", async () => {
  const commentMember = {
    id: "member-1",
    username: "olive",
    passport_points: 0,
  };
  const regularMember = {
    profile_id: "member-1",
    username: "olive",
    passport_points: 0,
  };
  let tree!: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <ThemeProvider>
        <MemberAvatar member={commentMember} />
        <MemberAvatar member={regularMember} />
      </ThemeProvider>
    );
  });
  expect(
    tree.root.findAllByProps({ accessibilityLabel: "Well rank" })
  ).toHaveLength(4);
  (supabase.rpc as jest.Mock).mockResolvedValue({
    data: { points: 500, stamps: [] },
    error: null,
  });
  await act(async () => {
    await getMemberPassport("member-1");
  });
  expect(
    tree.root.findAllByProps({ accessibilityLabel: "Premium rank" })
  ).toHaveLength(4);
  act(() => tree.unmount());
});
