import React from "react";
import { FlatList, Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import GoldenGlassList from "@/components/explore/GoldenGlassList";

const mockGetGoldenGlassRecipients = jest.fn();

jest.mock("@/services/goldenGlassService", () => ({
  getGoldenGlassRecipients: (...args: unknown[]) =>
    mockGetGoldenGlassRecipients(...args),
}));

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock("@/utils/native-tab-bar-insets", () => ({
  useNativeTabBarContentInset: () => 0,
}));

jest.mock("@/components/shared", () => ({
  Avatar: () => null,
  MartiniIcon: () => null,
  RatingPips: () => null,
}));

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: {
      awardGold: "gold",
      textMuted: "textMuted",
    },
  }),
  makeStyles: (factory: (theme: object) => object) => () =>
    factory({
      colors: {
        accent: "accent",
        awardGold: "gold",
        background: "background",
        surface: "surface",
        surfaceSunken: "surfaceSunken",
        text: "text",
        textMuted: "textMuted",
        textSecondary: "textSecondary",
      },
      elevation: { card: {} },
      isDark: false,
      radius: { card: 12, pill: 999, sm: 8 },
      spacing: {
        gutter: 16,
        lg: 20,
        md: 12,
        sm: 8,
        xs: 4,
        xxxl: 48,
      },
      typography: {
        body: {},
        caption: {},
        display: {},
        eyebrow: {},
        mono: {},
        title: {},
      },
    }),
}));

describe("GoldenGlassList", () => {
  let renderer: ReactTestRenderer | undefined;

  beforeEach(() => {
    mockGetGoldenGlassRecipients.mockReset();
  });

  afterEach(() => {
    act(() => renderer?.unmount());
  });

  it("scrolls the Golden Glass intro with its locations", async () => {
    mockGetGoldenGlassRecipients.mockResolvedValue([
      {
        regionId: 1,
        locationId: 7,
        venueName: "The Olive Room",
        address: "123 Main Street",
        neighborhood: null,
        rawOverall: 4.8,
        distinctReviewers: 4,
        latestReviewAt: "2026-08-25T12:00:00.000Z",
        refreshedAt: "2026-08-25T12:00:00.000Z",
        regulars: [],
        isGoldenGlass: true,
      },
    ]);

    await act(async () => {
      renderer = create(
        <GoldenGlassList enabled regionId={1} regionName="Vancouver" />
      );
      await Promise.resolve();
    });

    const list = renderer!.root.findByType(FlatList);
    const header = list.props.ListHeaderComponent as React.ReactElement;
    let headerRenderer!: ReactTestRenderer;
    act(() => {
      headerRenderer = create(header);
    });

    expect(
      headerRenderer.root.findAllByType(Text).map((node) => node.props.children)
    ).toEqual(
      expect.arrayContaining([
        "Golden Glass",
        "Places the club is raising a glass to right now.",
      ])
    );

    act(() => headerRenderer.unmount());
  });

  it("keeps the intro in the list while locations are loading", async () => {
    mockGetGoldenGlassRecipients.mockReturnValue(new Promise(() => undefined));

    await act(async () => {
      renderer = create(
        <GoldenGlassList enabled regionId={1} regionName="Vancouver" />
      );
      await Promise.resolve();
    });

    const list = renderer!.root.findByType(FlatList);
    expect(list.props.ListHeaderComponent).toBeTruthy();
    expect(list.props.data).toEqual([]);
  });
});
