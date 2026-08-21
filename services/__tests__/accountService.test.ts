import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import { deleteCurrentAccount } from "@/services/accountService";
import { supabase } from "@/utils/supabase";

jest.mock("expo-constants", () => ({
  __esModule: true,
  default: {
    expoConfig: {
      ios: { bundleIdentifier: "com.ohope.tinitimeclub" },
    },
  },
}));

jest.mock("expo-apple-authentication", () => ({
  refreshAsync: jest.fn(),
}));

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    functions: { invoke: jest.fn() },
  },
}));

const invoke = supabase.functions.invoke as jest.Mock;
const getSession = supabase.auth.getSession as jest.Mock;
const refreshAppleAuthorization = AppleAuthentication.refreshAsync as jest.Mock;

describe("accountService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getSession.mockResolvedValue({
      data: {
        session: {
          user: { identities: [{ provider: "email", id: "email-id" }] },
        },
      },
      error: null,
    });
  });

  it("requests authenticated server-side account deletion", async () => {
    invoke.mockResolvedValue({ data: { deleted: true }, error: null });

    await expect(deleteCurrentAccount()).resolves.toBeUndefined();

    expect(invoke).toHaveBeenCalledWith("delete-account", { body: {} });
  });

  it("refreshes and forwards Apple authorization before deletion", async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            identities: [
              {
                provider: "apple",
                id: "fallback-apple-id",
                identity_data: { sub: "apple-user-id" },
              },
            ],
          },
        },
      },
      error: null,
    });
    refreshAppleAuthorization.mockResolvedValue({
      authorizationCode: "fresh-authorization-code",
    });
    invoke.mockResolvedValue({ data: { deleted: true }, error: null });

    await expect(deleteCurrentAccount()).resolves.toBeUndefined();

    expect(refreshAppleAuthorization).toHaveBeenCalledWith({
      user: "apple-user-id",
    });
    expect(invoke).toHaveBeenCalledWith("delete-account", {
      body: {
        appleAuthorization: {
          authorizationCode: "fresh-authorization-code",
          clientId: Constants.expoConfig?.ios?.bundleIdentifier,
        },
      },
    });
  });

  it("does not request deletion when Apple omits the authorization code", async () => {
    getSession.mockResolvedValue({
      data: {
        session: {
          user: {
            identities: [{ provider: "apple", id: "apple-user-id" }],
          },
        },
      },
      error: null,
    });
    refreshAppleAuthorization.mockResolvedValue({ authorizationCode: null });

    await expect(deleteCurrentAccount()).rejects.toThrow(
      "Apple did not return an authorization code."
    );
    expect(invoke).not.toHaveBeenCalled();
  });

  it("rejects when the deletion endpoint fails", async () => {
    const error = new Error("deletion failed");
    invoke.mockResolvedValue({ data: null, error });

    await expect(deleteCurrentAccount()).rejects.toBe(error);
  });
});
