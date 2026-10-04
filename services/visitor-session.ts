import * as SecureStore from "expo-secure-store";
import {
  isMembershipIntent,
  safeMembershipReturnPath,
  type MembershipIntent,
} from "@/utils/membership";

const VISITOR_PREVIEW_KEY = "ttc.visitor-preview.accepted.v1";
const MEMBERSHIP_RETURN_KEY = "ttc.membership-return.v1";
// An abandoned "Join the Club" must not redirect a later, unrelated sign-in.
const MEMBERSHIP_RETURN_TTL_MS = 30 * 60 * 1000;

interface PendingMembershipReturn {
  intent: MembershipIntent;
  returnTo: string | null;
}

type StoredMembershipReturn = PendingMembershipReturn & { savedAt: number };

export const hasAcceptedVisitorPreview = async (): Promise<boolean> =>
  (await SecureStore.getItemAsync(VISITOR_PREVIEW_KEY)) === "1";

export const acceptVisitorPreview = async (): Promise<void> => {
  await SecureStore.setItemAsync(VISITOR_PREVIEW_KEY, "1");
};

export const savePendingMembershipReturn = async (
  intent: MembershipIntent,
  returnTo?: string | null
): Promise<void> => {
  const value: StoredMembershipReturn = {
    intent,
    returnTo: safeMembershipReturnPath(returnTo),
    savedAt: Date.now(),
  };
  await SecureStore.setItemAsync(MEMBERSHIP_RETURN_KEY, JSON.stringify(value));
};

export const getPendingMembershipReturn =
  async (): Promise<PendingMembershipReturn | null> => {
    const stored = await SecureStore.getItemAsync(MEMBERSHIP_RETURN_KEY);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored) as Partial<StoredMembershipReturn>;
      if (!isMembershipIntent(parsed.intent)) return null;
      if (
        typeof parsed.savedAt !== "number" ||
        Date.now() - parsed.savedAt > MEMBERSHIP_RETURN_TTL_MS
      ) {
        return null;
      }
      return {
        intent: parsed.intent,
        returnTo: safeMembershipReturnPath(parsed.returnTo),
      };
    } catch {
      return null;
    }
  };

export const clearPendingMembershipReturn = async (): Promise<void> => {
  await SecureStore.deleteItemAsync(MEMBERSHIP_RETURN_KEY);
};

export const consumePendingMembershipReturn =
  async (): Promise<PendingMembershipReturn | null> => {
    const pending = await getPendingMembershipReturn();
    await clearPendingMembershipReturn();
    return pending;
  };
