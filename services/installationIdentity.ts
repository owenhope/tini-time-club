import * as SecureStore from "expo-secure-store";
import { v4 as uuidv4 } from "uuid";

// One random identifier per installation lets the backend count anonymous app
// usage without collecting an email, advertising identifier, or device ID.
// Keep the existing push key so upgrades preserve the identifier they already
// created instead of making one installation look like two.
const INSTALLATION_ID_KEY = "push-installation-id";

// The backend RPCs take the identifier as a uuid, so a legacy or corrupted
// stored value that isn't one would fail registration forever. Regenerate
// instead of preserving it.
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let installationIdPromise: Promise<string> | null = null;

export const getInstallationId = async (): Promise<string> => {
  if (installationIdPromise) return installationIdPromise;

  installationIdPromise = (async () => {
    const storedId = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
    if (storedId && UUID_PATTERN.test(storedId)) return storedId;

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
