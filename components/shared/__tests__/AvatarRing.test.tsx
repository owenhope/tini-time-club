import React from "react";
import { View } from "react-native";
import renderer, { act } from "react-test-renderer";
import { Circle } from "react-native-svg";
import AvatarRing from "../AvatarRing";

it("leaves unknown points unranked and renders Well once zero is confirmed", async () => {
  let tree: renderer.ReactTestRenderer;
  const avatar = (points?: number | null) => (
    <AvatarRing passportPoints={points} size={40}>
      <View testID="avatar-face" />
    </AvatarRing>
  );
  await act(async () => {
    tree = renderer.create(avatar());
  });
  expect(tree!.root.findAllByType(Circle)).toHaveLength(0);
  expect(
    tree!.root.findAllByProps({ accessibilityLabel: "Well rank" })
  ).toHaveLength(0);
  expect(tree!.root.findByProps({ testID: "avatar-face" })).toBeTruthy();

  await act(async () => {
    tree!.update(avatar(0));
  });
  expect(tree!.root.findAllByType(Circle)).toHaveLength(1);
  expect(
    tree!.root.findByProps({ accessibilityLabel: "Well rank" })
  ).toBeTruthy();

  await act(async () => {
    tree!.update(avatar(500));
  });
  expect(
    tree!.root.findByProps({ accessibilityLabel: "Premium rank" })
  ).toBeTruthy();
  await act(async () => {
    tree!.update(avatar(null));
  });
  expect(tree!.root.findAllByType(Circle)).toHaveLength(0);
  expect(
    tree!.root.findAllByProps({ accessibilityLabel: "Premium rank" })
  ).toHaveLength(0);
  act(() => tree!.unmount());
});
