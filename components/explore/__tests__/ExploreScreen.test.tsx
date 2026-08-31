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

jest.mock("@/components/explore/ExploreRegionSelector", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  return function MockExploreRegionSelector() {
    return React.createElement("ExploreRegionSelector");
  };
});

const mockRequestLocation = jest.fn(async () => undefined);
const mockRequireMembership = jest.fn();
let mockIsMember = true;
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

jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({
    isMember: mockIsMember,
    requireMembership: (intent: string) => mockRequireMembership(intent),
  }),
}));

jest.mock("@/hooks/useExploreRegion", () => ({
  useExploreRegion: () => ({
    state: {
      status: "ready",
      regions: [],
      selectedRegion: null,
      locationStatus: "idle",
    },
    selectRegion: jest.fn(async () => undefined),
    useMyLocation: jest.fn(async () => undefined),
  }),
}));

jest.mock("@/theme", () => ({
  makeStyles: (factory: (theme: object) => object) => () =>
    factory({
      colors: { surfaceInk: "ink", background: "paper" },
      spacing: { sm: 4 },
    }),
  useTheme: () => ({ colors: { onInk: "paper" } }),
}));

describe("ExploreScreen", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    mockIsMember = true;
    mockRequireMembership.mockReset();
    mockRequireMembership.mockReturnValue(true);
  });

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
    expect(
      renderer!.root.findAllByType("ExploreRegionSelector" as React.ElementType)
    ).toHaveLength(0);
    expect(lists.props.enabled).toBe(true);
    expect(lists.props.activeView).toBe("members");

    const toggle = renderer!.root.findByType(
      "SegmentedControl" as React.ElementType
    );
    expect(
      toggle.props.options.map(({ label }: { label: string }) => label)
    ).toEqual(["Map", "Golden Glass", "Members"]);
    act(() => toggle.props.onChange("golden-glass"));
    expect(onViewChange).toHaveBeenCalledWith("golden-glass");
  });

  it("keeps visitors on Map and gates the Golden Glass and Members views", () => {
    mockIsMember = false;
    mockRequireMembership.mockReturnValue(false);
    const onViewChange = jest.fn();

    act(() => {
      renderer = create(
        <ExploreScreen view="map" onViewChange={onViewChange} mapFocus={{}} />
      );
    });

    const toggle = renderer!.root.findByType(
      "SegmentedControl" as React.ElementType
    );

    act(() => toggle.props.onChange("places"));
    expect(mockRequireMembership).toHaveBeenLastCalledWith("golden-glass");
    expect(onViewChange).not.toHaveBeenCalled();

    act(() => toggle.props.onChange("members"));
    expect(mockRequireMembership).toHaveBeenLastCalledWith("members-directory");
    expect(onViewChange).not.toHaveBeenCalled();
    expect(
      renderer!.root.findByType("ExploreMap" as React.ElementType).props.enabled
    ).toBe(true);
    expect(
      renderer!.root.findByType("ExploreLists" as React.ElementType).props
        .enabled
    ).toBe(false);
  });

  it("intercepts a visitor deep link before a discovery list is enabled", () => {
    mockIsMember = false;
    mockRequireMembership.mockReturnValue(false);

    act(() => {
      renderer = create(
        <ExploreScreen view="members" onViewChange={jest.fn()} mapFocus={{}} />
      );
    });

    expect(mockRequireMembership).toHaveBeenCalledWith("members-directory");
    expect(
      renderer!.root.findByType("SegmentedControl" as React.ElementType).props
        .value
    ).toBe("map");
    expect(
      renderer!.root.findByType("ExploreMap" as React.ElementType).props.enabled
    ).toBe(true);
    expect(
      renderer!.root.findByType("ExploreLists" as React.ElementType).props
        .enabled
    ).toBe(false);

    act(() => {
      renderer!.update(
        <ExploreScreen view="members" onViewChange={jest.fn()} mapFocus={{}} />
      );
    });
    expect(mockRequireMembership).toHaveBeenCalledTimes(1);
  });
});
