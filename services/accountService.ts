import Constants from "expo-constants";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import { supabase } from "@/utils/supabase";

type AppleDeletionAuthorization = {
  authorizationCode: string;
  clientId: string;
};

const getAppleDeletionAuthorization = async (): Promise<
  AppleDeletionAuthorization | undefined
> => {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) throw error;

  const appleIdentity = session?.user.identities?.find(
    (identity) => identity.provider === "apple"
  );
  if (!appleIdentity) return undefined;

  if (Platform.OS !== "ios") {
    throw new Error(
      "Sign in with Apple authorization can only be revoked from the iOS app."
    );
  }

  const appleUserId =
    typeof appleIdentity.identity_data?.sub === "string"
      ? appleIdentity.identity_data.sub
      : appleIdentity.id;
  const clientId = Constants.expoConfig?.ios?.bundleIdentifier;

  if (!appleUserId || !clientId) {
    throw new Error("Sign in with Apple account information is unavailable.");
  }

  const credential = await AppleAuthentication.refreshAsync({
    user: appleUserId,
  });

  if (!credential.authorizationCode) {
    throw new Error("Apple did not return an authorization code.");
  }

  return {
    authorizationCode: credential.authorizationCode,
    clientId,
  };
};

export async function deleteCurrentAccount(): Promise<void> {
  const appleAuthorization = await getAppleDeletionAuthorization();
  const { error } = await supabase.functions.invoke("delete-account", {
    body: appleAuthorization ? { appleAuthorization } : {},
  });

  if (error) throw error;
}
