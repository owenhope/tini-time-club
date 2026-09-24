import { supabase } from "@/utils/supabase";
import { runExpectedSignOut } from "@/utils/authTelemetry";
import { clearUserCaches } from "@/utils/signOut";
import { unregisterPushNotificationsAsync } from "@/services/pushNotificationService";

export async function isUsernameAvailable(
  candidate: string,
  profileId: string
) {
  // LIKE treats underscores and percent signs as wildcards, even in usernames.
  const literal = candidate.replace(/[\\%_]/g, "\\$&");
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", literal)
    .eq("deleted", false)
    .neq("id", profileId)
    .limit(1);
  if (error) throw error;
  return !data?.length;
}

export async function signOutAfterDecliningTerms() {
  await unregisterPushNotificationsAsync();
  const { error } = await runExpectedSignOut("declined-terms", () =>
    supabase.auth.signOut()
  );
  if (error) throw error;
  await clearUserCaches();
}
