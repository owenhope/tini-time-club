import React, { useContext, useEffect } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import {
  PassportToastContext,
  PassportToastProvider,
} from "../passport-toast-context";
import { decodePassportStamp } from "@/services/passportService";

let mockPath = "/onboarding";
let mockAccepted = false;
const mockReconcile = jest.fn();
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => mockPath,
  useGlobalSearchParams: () => ({}),
}));
jest.mock("@/context/profile-context", () => ({
  useProfile: () => ({
    profile: { id: "member", eula_accepted: mockAccepted },
  }),
}));
jest.mock("@/utils/memberPoints", () => ({
  beginMemberPointsRead: () => ({}),
  isMemberPointsReadCurrent: () => true,
}));
jest.mock("@/services/passportService", () => ({
  ...jest.requireActual("@/services/passportService"),
  reconcileMyPassport: () => mockReconcile(),
}));
jest.mock("@/utils/supabase", () => ({ supabase: {} }));
jest.mock("react-native-safe-area-context", () => ({
  useSafeAreaInsets: () => ({ top: 0 }),
}));
jest.mock("@/components/shared", () => ({ AppText: "AppText" }));
jest.mock("@/components/passport/passport-stamp", () => ({
  PassportStamp: () => null,
}));
jest.mock("@/theme", () => ({ makeStyles: () => () => ({}) }));
jest.mock("expo-haptics", () => ({
  notificationAsync: jest.fn(),
  NotificationFeedbackType: { Success: "success" },
}));

let show: React.ContextType<typeof PassportToastContext>["showPassportStamps"];
function Child() {
  const callback = useContext(PassportToastContext).showPassportStamps;
  useEffect(() => {
    show = callback;
  }, [callback]);
  return null;
}
const tree = () => (
  <PassportToastProvider>
    <Child />
  </PassportToastProvider>
);
let renderer: ReactTestRenderer;
beforeEach(() => {
  mockPath = "/onboarding";
  mockAccepted = false;
  mockReconcile
    .mockReset()
    .mockResolvedValue({ profileId: "member", unlocked: [] });
  jest.useFakeTimers();
});
afterEach(() => {
  act(() => renderer?.unmount());
  jest.useRealTimers();
});
const stamp = decodePassportStamp({
  id: "city",
  key: "first-home-city",
  metric: "home_city",
  label: "Home City",
  points: 10,
  earned: true,
});

it("waits for Home before reconciling and showing onboarding stamps", async () => {
  await act(async () => {
    renderer = create(tree());
  });
  act(() => show([stamp], "member"));
  expect(JSON.stringify(renderer.toJSON())).not.toContain("Home City");
  expect(mockReconcile).not.toHaveBeenCalled();
  mockAccepted = true;
  await act(async () => {
    renderer.update(tree());
  });
  expect(mockReconcile).not.toHaveBeenCalled();
  mockPath = "/home";
  await act(async () => {
    renderer.update(tree());
  });
  expect(mockReconcile).toHaveBeenCalledTimes(1);
  expect(JSON.stringify(renderer.toJSON())).toContain("Home City · +10 pts");
});
it("omits Passport Stamp from single and summary toasts", async () => {
  mockAccepted = true;
  mockPath = "/home";
  await act(async () => {
    renderer = create(tree());
  });
  act(() => show([stamp], "member"));
  expect(JSON.stringify(renderer.toJSON())).not.toContain("Passport Stamp");
  act(() => renderer.unmount());
  await act(async () => {
    renderer = create(tree());
  });
  act(() =>
    show(
      [0, 1, 2, 3].map((n) => ({ ...stamp, id: String(n) })),
      "member"
    )
  );
  expect(JSON.stringify(renderer.toJSON())).toContain("4 new stamps · +40 pts");
  expect(JSON.stringify(renderer.toJSON())).not.toContain("Passport Stamp");
});
