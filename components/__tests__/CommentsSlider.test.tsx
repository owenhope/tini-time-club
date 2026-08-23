import React from "react";
import { ActionSheetIOS, Alert, StyleSheet, Text } from "react-native";
import renderer, { act } from "react-test-renderer";
import CommentsSlider from "../CommentsSlider";
import databaseService from "@/services/databaseService";
import { ThemeProvider, typography } from "@/theme";
import ReportModal from "@/components/ReportModal";

const mockGetCommentPage = jest.fn();
const mockSetTabBarHidden = jest.fn();

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
}));

jest.mock("@gorhom/bottom-sheet", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { TextInput, View: RNView } =
    jest.requireActual<typeof import("react-native")>("react-native");
  const Sheet = ({ children, footerComponent }: any) =>
    ReactActual.createElement(
      RNView,
      null,
      children,
      footerComponent?.({ animatedFooterPosition: { value: 0 } })
    );
  const SheetList = ReactActual.forwardRef(
    ({ data, renderItem, ListEmptyComponent }: any, _ref: any) =>
      ReactActual.createElement(
        RNView,
        null,
        data.length
          ? data.map((item: any, index: number) =>
              ReactActual.createElement(
                RNView,
                { key: item.id },
                renderItem({ item, index })
              )
            )
          : ListEmptyComponent
      )
  );
  return {
    __esModule: true,
    default: Sheet,
    BottomSheetBackdrop: () => null,
    BottomSheetFlatList: SheetList,
    BottomSheetFooter: ({ children }: any) =>
      ReactActual.createElement(RNView, null, children),
    BottomSheetTextInput: TextInput,
  };
});

jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock("expo-router", () => ({
  useSegments: () => ["(tabs)"],
}));

jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({ profile: { id: "viewer-1" } }),
}));

jest.mock("@/context/membership-context", () => ({
  useMembership: () => ({
    isMember: true,
    requireMembership: jest.fn(() => true),
    openMembership: jest.fn(),
  }),
}));

jest.mock("@/context/tab-bar-visibility-context", () => ({
  useTabBarVisibility: () => ({ setHidden: mockSetTabBarHidden }),
}));

jest.mock("@/hooks/useAppNavigation", () => ({
  useOpenProfile: () => jest.fn(),
}));

jest.mock("@/services/databaseService", () => ({
  __esModule: true,
  default: {
    getComments: jest.fn(),
    createComment: jest.fn(),
    deleteComment: jest.fn(),
    setCommentLiked: jest.fn(),
    reportComment: jest.fn(),
  },
}));

jest.mock("@/services/commentPageService", () => ({
  getCommentPage: (...args: unknown[]) => mockGetCommentPage(...args),
}));

jest.mock("@/services/analyticsService", () => ({
  __esModule: true,
  default: { capture: jest.fn() },
}));

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light" },
}));

jest.mock("@expo/vector-icons", () => {
  const ReactActual = jest.requireActual<typeof import("react")>("react");
  const { Text: RNText } =
    jest.requireActual<typeof import("react-native")>("react-native");
  return {
    Ionicons: (props: { name: string; size?: number }) =>
      ReactActual.createElement(RNText as React.ElementType, props, props.name),
  };
});

jest.mock("@/components/shared", () => ({
  Avatar: () => null,
  VerifiedName: ({ name }: { name: string }) => {
    const ReactActual = jest.requireActual<typeof import("react")>("react");
    const { Text: RNText } =
      jest.requireActual<typeof import("react-native")>("react-native");
    return ReactActual.createElement(RNText, null, name);
  },
}));

jest.mock("@/components/ReportModal", () => ({
  __esModule: true,
  default: jest.fn(() => null),
}));

jest.mock("@/utils/log", () => ({
  reportError: jest.fn(),
}));

const comment = {
  id: 22,
  body: "Perfectly cold.",
  inserted_at: new Date().toISOString(),
  review_id: 9,
  user_id: "author-1",
  profile: { id: "author-1", username: "olivefan" },
  likes_count: 0,
  has_liked: false,
};

const review = {
  id: "9",
  user_id: "review-author",
  location: { id: "3", name: "Dovetail" },
};

const setCommentLiked = databaseService.setCommentLiked as jest.Mock;
const reportComment = databaseService.reportComment as jest.Mock;

const renderSlider = async () => {
  let tree: renderer.ReactTestRenderer;
  await act(async () => {
    tree = renderer.create(
      <ThemeProvider>
        <CommentsSlider review={review} onClose={jest.fn()} />
      </ThemeProvider>
    );
  });
  return tree!;
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetCommentPage.mockResolvedValue({
    comments: [comment],
    nextCursor: null,
    hasMore: false,
    totalCount: 1,
  });
  setCommentLiked.mockResolvedValue(undefined);
  reportComment.mockResolvedValue("created");
});

it("optimistically toggles a comment heart and hides a zero count", async () => {
  const tree = await renderSlider();
  const emptyHeart = tree.root.findByProps({
    accessibilityLabel: "Like comment",
  });
  const commentBody = tree.root
    .findAllByType(Text)
    .find((node) => node.props.children === "Perfectly cold.");

  expect(StyleSheet.flatten(commentBody?.props.style)).toEqual(
    expect.objectContaining(typography.body)
  );
  expect(emptyHeart.props.children[1]).toBeNull();
  expect(emptyHeart.findByProps({ name: "heart-outline" }).props.size).toBe(16);

  await act(async () => {
    await emptyHeart.props.onPress();
  });

  expect(setCommentLiked).toHaveBeenCalledWith(22, "viewer-1", true, "9");
  const filledHeart = tree.root.findByProps({
    accessibilityLabel: "Unlike comment",
  });
  expect(filledHeart.props.accessibilityState).toEqual({ selected: true });
  expect(filledHeart.props.style.flexDirection).toBe("column");
  expect(filledHeart.findByProps({ name: "heart" }).props.size).toBe(16);
  expect(StyleSheet.flatten(filledHeart.props.children[1].props.style)).toEqual(
    expect.objectContaining(typography.label)
  );
  expect(
    tree.root
      .findAllByType(Text)
      .some((node) => String(node.props.children) === "1")
  ).toBe(true);
});

it("does not lift the comment input above the native tab bar", async () => {
  const tree = await renderSlider();
  const input = tree.root.findByProps({ placeholder: "Add a comment..." });
  const inputContainer = input.parent;

  expect(StyleSheet.flatten(inputContainer?.props.style).paddingBottom).toBe(
    34
  );
});

it("covers the native tab bar while the comments sheet is mounted", async () => {
  const tree = await renderSlider();

  expect(mockSetTabBarHidden).toHaveBeenCalledWith(true);
  act(() => tree.unmount());
  expect(mockSetTabBarHidden).toHaveBeenLastCalledWith(false);
});

it("reports someone else's comment from its long-press menu", async () => {
  const actionSheet = jest
    .spyOn(ActionSheetIOS, "showActionSheetWithOptions")
    .mockImplementation((_options, callback) => callback(1));
  const alert = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
  const tree = await renderSlider();
  const row = tree.root.findByProps({
    accessibilityHint: "Long press for comment options",
  });

  act(() => row.props.onLongPress());

  expect(actionSheet).toHaveBeenCalledWith(
    expect.objectContaining({ options: ["Cancel", "Report Comment"] }),
    expect.any(Function)
  );
  const modalProps = (ReportModal as jest.Mock).mock.calls.at(-1)?.[0];
  expect(modalProps).toEqual(
    expect.objectContaining({ visible: true, title: "Report Comment" })
  );

  await act(async () => {
    modalProps.onSelect("Spam");
    await Promise.resolve();
  });

  expect(reportComment).toHaveBeenCalledWith(22, "Spam");
  expect(alert).toHaveBeenCalledWith(
    "Report Submitted",
    "Thanks. We’ll review this comment."
  );
});
