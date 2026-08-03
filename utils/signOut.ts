import authCache from "@/utils/authCache";
import imageCache from "@/utils/imageCache";
import databaseService from "@/services/databaseService";
import { reportError } from "@/utils/log";

/**
 * Empty every cache that holds one member's data.
 *
 * There are three of them and signing out only ever cleared the first, so a
 * second account signing in on the same device could be served the previous
 * member's feed pages, profiles, blocked-id list or avatar URLs until each
 * entry expired on its own — 15 minutes for user data, 4 hours for the
 * static lookups.
 *
 * Best-effort: a cache that refuses to clear must not stop the sign-out.
 */
export const clearUserCaches = async (): Promise<void> => {
  await Promise.allSettled([
    authCache.invalidateCache(),
    databaseService.clearAllCaches(),
    imageCache.clearCache(),
  ]).then((results) => {
    for (const result of results) {
      if (result.status === "rejected") {
        reportError("Error clearing cache on sign out:", result.reason);
      }
    }
  });
};

export default clearUserCaches;
