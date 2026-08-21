import React from "react";
import renderer, { act } from "react-test-renderer";
import LocationDetails from "../locationDetails";
import { ThemeProvider } from "@/theme";

jest.mock("react-native", () => {
  const actual = jest.requireActual("react-native");
  return new Proxy(actual, {
    get(target, prop) {
      if (prop === "useColorScheme") {
        return jest.fn(() => "dark");
      }
      return target[prop];
    },
  });
});

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

const mockPush = jest.fn();
const mockRequireMembership = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({ requireMembership: mockRequireMembership }),
}));

jest.mock("@expo/vector-icons", () => ({
  Ionicons: () => null,
}));

jest.mock("@/components/shared", () => ({
  Avatar: () => null,
  RatingPips: () => null,
}));

describe("location details", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockRequireMembership.mockReset();
    mockRequireMembership.mockReturnValue(true);
  });

  it("shows the membership CTA instead of opening deeper visitor actions", () => {
    mockRequireMembership.mockReturnValue(false);
    const onRegularsPress = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <LocationDetails
            loc={{
              id: 1,
              name: "The Martini Room",
              rating: 4.2,
              total_ratings: 12,
              regulars: [
                {
                  profile_id: "member-1",
                  username: "olive",
                  review_count: 3,
                },
              ],
            }}
            onRegularsPress={onRegularsPress}
          />
        </ThemeProvider>
      );
    });

    const title = tree!.root.find(
      (node) => node.props.accessibilityLabel === "View The Martini Room"
    );
    const regulars = tree!.root.find(
      (node) =>
        node.props.accessibilityLabel === "Show regulars at The Martini Room"
    );

    act(() => title.props.onPress());
    act(() => regulars.props.onPress());

    expect(mockRequireMembership).toHaveBeenNthCalledWith(
      1,
      "location-details"
    );
    expect(mockRequireMembership).toHaveBeenNthCalledWith(
      2,
      "location-details"
    );
    expect(mockPush).not.toHaveBeenCalled();
    expect(onRegularsPress).not.toHaveBeenCalled();

    act(() => tree!.unmount());
  });

  it("preserves location navigation and Regulars for signed-in members", () => {
    const onRegularsPress = jest.fn();
    let tree: renderer.ReactTestRenderer;

    act(() => {
      tree = renderer.create(
        <ThemeProvider>
          <LocationDetails
            loc={{
              id: 1,
              name: "The Martini Room",
              regulars: [
                {
                  profile_id: "member-1",
                  username: "olive",
                  review_count: 3,
                },
              ],
            }}
            onRegularsPress={onRegularsPress}
          />
        </ThemeProvider>
      );
    });

    const title = tree!.root.find(
      (node) => node.props.accessibilityLabel === "View The Martini Room"
    );
    const regulars = tree!.root.find(
      (node) =>
        node.props.accessibilityLabel === "Show regulars at The Martini Room"
    );

    act(() => title.props.onPress());
    act(() => regulars.props.onPress());

    expect(mockPush).toHaveBeenCalledWith("/places/1");
    expect(onRegularsPress).toHaveBeenCalledTimes(1);

    act(() => tree!.unmount());
  });
});
