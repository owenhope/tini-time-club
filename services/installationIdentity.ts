import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";

// One random identifier per installation lets the backend count anonymous app
// usage without collecting an email, advertising identifier, or device ID.
// Keep the existing push key so upgrades preserve the identifier they already
// created instead of making one installation look like two.
const INSTALLATION_ID_KEY = "push-installation-id";

let installationIdPromise: Promise<string> | null = null;

export const getInstallationId = async (): Promise<string> => {
  if (installationIdPromise) return installationIdPromise;

  installationIdPromise = (async () => {
    const storedId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
    if (storedId) return storedId;

    const installationId = uuidv4();
    await SecureStore.setItemAsync(INSTALLATION_ID_KEY, installationId);
    return installationId;
  })();

  try {
    return await installationIdPromise;
  } catch (error) {
    installationIdPromise = null;
    throw error;
  }
};

export const resetInstallationIdentityForTests = () => {
  installationIdPromise = null;
};
