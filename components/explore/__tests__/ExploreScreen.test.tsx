import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import ExploreScreen from "@/components/explore/ExploreScreen";

jest.mock("@/components/nav/AppHeader", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return function MockAppHeader({
    below,
    ...props
  }: {
    below?: React.ReactNode;
  }) {
    return React.createElement("AppHeader", props, below);
  };
});

jest.mock("@/components/shared", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return {
    SegmentedControl: (props: object) =>
      React.createElement("SegmentedControl", props),
  };
});

jest.mock("@/components/explore/ExploreMap", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return function MockExploreMap(props: object) {
    return React.createElement("ExploreMap", props);
  };
});

jest.mock("@/components/explore/ExploreLists", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return function MockExploreLists(props: object) {
    return React.createElement("ExploreLists", props);
  };
});

const mockRequestLocation = jest.fn(async () => undefined);
jest.mock("@/components/explore/useExploreLocation", () => ({
  useExploreLocation: () => ({
    state: {
      status: "idle",
      coordinates: null,
      canOpenSettings: false,
    },
    request: mockRequestLocation,
  }),
}));

jest.mock("@/theme", () => ({
  makeStyles: (factory: (theme: object) => object) => () =>
    factory({
      colors: { surfaceInk: "ink", background: "paper" },
    }),
}));

describe("ExploreScreen", () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(() => {
    act(() => renderer?.unmount());
  });

  it("keeps both panels mounted and enables only the selected mode", () => {
    const onViewChange = jest.fn();

    act(() => {
      renderer = create(
        <ExploreScreen view="map" onViewChange={onViewChange} mapFocus={{}} />
      );
    });

    expect(
      renderer!.root.findByType("ExploreMap" as React.ElementType).props.enabled
    ).toBe(true);
    expect(
      renderer!.root.findByType("ExploreLists" as React.ElementType).props
        .enabled
    ).toBe(false);

    act(() => {
      renderer!.update(
        <ExploreScreen
          view="members"
          onViewChange={onViewChange}
          mapFocus={{}}
        />
      );
    });

    const lists = renderer!.root.findByType(
      "ExploreLists" as React.ElementType
    );
    expect(
      renderer!.root.findByType("ExploreMap" as React.ElementType).props.enabled
    ).toBe(false);
    expect(lists.props.enabled).toBe(true);
    expect(lists.props.activeView).toBe("members");

    const toggle = renderer!.root.findByType(
      "SegmentedControl" as React.ElementType
    );
    expect(
      toggle.props.options.map(({ label }: { label: string }) => label)
    ).toEqual(["Map", "Top Places", "Members"]);
    act(() => toggle.props.onChange("places"));
    expect(onViewChange).toHaveBeenCalledWith("places");
  });
});
