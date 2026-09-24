import {
  isUsernameAvailable,
  signOutAfterDecliningTerms,
} from "../onboardingService";
import { supabase } from "@/utils/supabase";
import { clearUserCaches } from "@/utils/signOut";
import { unregisterPushNotificationsAsync } from "@/services/pushNotificationService";

jest.mock("@/utils/supabase", () => ({
  supabase: { from: jest.fn(), auth: { signOut: jest.fn() } },
}));
jest.mock("@/utils/signOut", () => ({ clearUserCaches: jest.fn() }));
jest.mock("@/services/pushNotificationService", () => ({
  unregisterPushNotificationsAsync: jest.fn(),
}));
jest.mock("@/utils/authTelemetry", () => ({
  runExpectedSignOut: (_reason: string, action: () => Promise<unknown>) =>
    action(),
}));

beforeEach(() => {
  jest.resetAllMocks();
  (supabase.auth.signOut as jest.Mock).mockResolvedValue({ error: null });
});

it("checks the literal username while excluding the current and deleted profiles", async () => {
  const query = {
    select: jest.fn(),
    ilike: jest.fn(),
    eq: jest.fn(),
    neq: jest.fn(),
    limit: jest.fn(),
  };
  for (const method of [query.select, query.ilike, query.eq, query.neq])
    method.mockReturnValue(query);
  query.limit.mockResolvedValue({ data: [], error: null });
  (supabase.from as jest.Mock).mockReturnValue(query);
  await expect(isUsernameAvailable("abc_def", "current-member")).resolves.toBe(
    true
  );
  expect(query.ilike).toHaveBeenCalledWith("username", "abc\\_def");
  expect(query.eq).toHaveBeenCalledWith("deleted", false);
  expect(query.neq).toHaveBeenCalledWith("id", "current-member");
  query.limit.mockResolvedValue({
    data: [{ id: "other-member" }],
    error: null,
  });
  await expect(isUsernameAvailable("abc_def", "current-member")).resolves.toBe(
    false
  );
  const error = new Error("offline");
  query.limit.mockResolvedValue({ data: null, error });
  await expect(isUsernameAvailable("abc_def", "current-member")).rejects.toBe(
    error
  );
});

it.each(["returned", "thrown"])(
  "preserves caches and permits retry after a %s sign-out failure",
  async (kind) => {
    const error = new Error("offline");
    const signOut = supabase.auth.signOut as jest.Mock;
    if (kind === "returned") signOut.mockResolvedValueOnce({ error });
    else signOut.mockRejectedValueOnce(error);
    await expect(signOutAfterDecliningTerms()).rejects.toBe(error);
    expect(clearUserCaches).not.toHaveBeenCalled();
    await expect(signOutAfterDecliningTerms()).resolves.toBeUndefined();
    expect(clearUserCaches).toHaveBeenCalledTimes(1);
    expect(unregisterPushNotificationsAsync).toHaveBeenCalledTimes(2);
  }
);

it("contains push cleanup failure before signing out", async () => {
  const error = new Error("offline");
  (unregisterPushNotificationsAsync as jest.Mock).mockRejectedValueOnce(error);
  await expect(signOutAfterDecliningTerms()).rejects.toBe(error);
  expect(supabase.auth.signOut).not.toHaveBeenCalled();
  expect(clearUserCaches).not.toHaveBeenCalled();
});
