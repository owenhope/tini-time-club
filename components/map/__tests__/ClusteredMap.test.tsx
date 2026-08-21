import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import ClusteredMap from "@/components/map/ClusteredMap";

jest.mock("react-native-map-clustering", () => {
  const React = jest.requireActual<typeof import("react")>("react");
  const MockClusteredMapView = React.forwardRef(
    (props: object, ref: React.Ref<unknown>) =>
      React.createElement("ClusteredMapView", { ...props, ref })
  );
  MockClusteredMapView.displayName = "MockClusteredMapView";
  return MockClusteredMapView;
});

describe("ClusteredMap", () => {
  let renderer: ReactTestRenderer | undefined;

  afterEach(() => {
    act(() => renderer?.unmount());
  });

  it("enables cluster layout animation while the map stays mounted", () => {
    let mapRenderer: ReactTestRenderer;
    act(() => {
      mapRenderer = create(<ClusteredMap />);
      renderer = mapRenderer;
    });

    expect(
      mapRenderer!.root.findByType("ClusteredMapView" as React.ElementType)
        .props.animationEnabled
    ).toBe(true);
  });
});
