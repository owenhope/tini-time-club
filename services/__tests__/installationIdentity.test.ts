const mockSecureStore = new Map<string, string>();
const mockUuid = jest.fn(() => "7850f79e-df35-4ecc-b517-e8dd66307b15");

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(
    async (key: string) => mockSecureStore.get(key) ?? null
  ),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockSecureStore.set(key, value);
  }),
}));
jest.mock("uuid", () => ({ v4: () => mockUuid() }));

import {
  getInstallationId,
  resetInstallationIdentityForTests,
} from "@/services/installationIdentity";

beforeEach(() => {
  mockSecureStore.clear();
  mockUuid.mockClear();
  resetInstallationIdentityForTests();
});

it("creates and persists one random installation identifier", async () => {
  await expect(getInstallationId()).resolves.toBe(
    "7850f79e-df35-4ecc-b517-e8dd66307b15"
  );
  await expect(getInstallationId()).resolves.toBe(
    "7850f79e-df35-4ecc-b517-e8dd66307b15"
  );

  expect(mockUuid).toHaveBeenCalledTimes(1);
  expect(mockSecureStore.get("push-installation-id")).toBe(
    "7850f79e-df35-4ecc-b517-e8dd66307b15"
  );
});

it("reuses the identifier created by an earlier app version", async () => {
  mockSecureStore.set(
    "push-installation-id",
    "7622237a-8fc1-46a0-b389-76e96978acc9"
  );

  await expect(getInstallationId()).resolves.toBe(
    "7622237a-8fc1-46a0-b389-76e96978acc9"
  );
  expect(mockUuid).not.toHaveBeenCalled();
});
