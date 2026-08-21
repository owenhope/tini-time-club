const mockSecureStore = new Map<string, string>();

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(
    async (key: string) => mockSecureStore.get(key) ?? null
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockSecureStore.delete(key);
  }),
}));

import {
  acceptVisitorPreview,
  consumePendingMembershipReturn,
  getPendingMembershipReturn,
  hasAcceptedVisitorPreview,
  savePendingMembershipReturn,
} from "@/services/visitor-session";

beforeEach(() => {
  mockSecureStore.clear();
});

it("remembers that the person chose visitor preview", async () => {
  await expect(hasAcceptedVisitorPreview()).resolves.toBe(false);
  await acceptVisitorPreview();
  await expect(hasAcceptedVisitorPreview()).resolves.toBe(true);
});

it("persists a safe destination across the auth handoff", async () => {
  await savePendingMembershipReturn("comment", "/r/42?comments=1");

  await expect(getPendingMembershipReturn()).resolves.toEqual({
    intent: "comment",
    returnTo: "/r/42?comments=1",
  });
  await expect(consumePendingMembershipReturn()).resolves.toEqual({
    intent: "comment",
    returnTo: "/r/42?comments=1",
  });
  await expect(getPendingMembershipReturn()).resolves.toBeNull();
});

it("drops an external auth return destination", async () => {
  await savePendingMembershipReturn("profile", "https://example.com/phish");

  await expect(getPendingMembershipReturn()).resolves.toEqual({
    intent: "profile",
    returnTo: null,
  });
});
